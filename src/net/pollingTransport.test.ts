import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Move } from "@/engine";
import {
  createPollingTransport,
  type PageVisibility,
} from "./pollingTransport";
import type { ConnectionState, RoomUpdate } from "./transport";

const ROOM_CODE = "ABCDEF";
const self = { playerId: "alice", name: "Alice" };
const bob = { playerId: "bob", name: "Bob" };
const move = (playerId: string): Move => ({
  type: "drawFromDeck",
  playerId,
});

interface Call {
  readonly method: string;
  readonly query: string;
  readonly roomHeader: string;
  readonly body: unknown;
}

function createFakeServer() {
  const moves: Move[] = [];
  const calls: Call[] = [];
  let failing = false;
  let players = [self];

  const respond = (status: number, body: unknown) =>
    Promise.resolve(Response.json(body, { status }));

  const fetchFake = (input: string | URL | Request, init?: RequestInit) => {
    const query = (typeof input === "string" ? input : "").replace("api/", "");
    const headers = new Headers(init?.headers);
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({
      method: init?.method ?? "GET",
      query,
      roomHeader: headers.get("X-Room") ?? "",
      body,
    });
    if (failing) {
      return respond(503, { error: "down" });
    }
    if (query === "?action=join") {
      return respond(200, { players });
    }
    if (query === "?action=move") {
      const request = body as { sequence: number; move: Move };
      if (request.sequence !== moves.length) {
        return respond(409, { error: "conflict", length: moves.length });
      }
      moves.push(request.move);
      return respond(200, { length: moves.length });
    }
    const since = Number(new URLSearchParams(query).get("since"));
    return respond(200, {
      length: moves.length,
      moves: moves.slice(since),
      players,
    });
  };

  return {
    calls,
    moves,
    fetch: vi.fn(fetchFake) as typeof fetch,
    reads: () => calls.filter((call) => call.method === "GET"),
    breakDown: () => {
      failing = true;
    },
    recover: () => {
      failing = false;
    },
    addPlayer: () => {
      players = [self, bob];
    },
  };
}

function createPage() {
  const target = new EventTarget();
  const page = {
    hidden: false as boolean,
    addEventListener: (type, listener) => {
      target.addEventListener(type, listener);
    },
    removeEventListener: (type, listener) => {
      target.removeEventListener(type, listener);
    },
  } satisfies PageVisibility;
  return {
    page,
    setHidden: (hidden: boolean) => {
      page.hidden = hidden;
      target.dispatchEvent(new Event("visibilitychange"));
    },
  };
}

async function connect(
  server: ReturnType<typeof createFakeServer>,
  page = createPage(),
) {
  const updates: RoomUpdate[] = [];
  const states: ConnectionState[] = [];
  const transport = createPollingTransport({
    fetch: server.fetch,
    page: page.page,
  })(ROOM_CODE, self, {
    onUpdate: (update) => updates.push(update),
    onConnectionChange: (state) => states.push(state),
  });
  // Hashing the room code is truly asynchronous, so fake timers cannot advance it.
  await vi.waitFor(() => {
    expect(server.reads()).toHaveLength(1);
  });
  return { transport, updates, states, page };
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

describe("polling transport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("announces the player and fetches the whole log on connect", async () => {
    const server = createFakeServer();
    server.moves.push(move("alice"), move("bob"));
    const { updates, states } = await connect(server);
    expect(server.calls.map((call) => call.query)).toEqual([
      "?action=join",
      "?since=0",
    ]);
    expect(updates.at(-1)).toMatchObject({ firstIndex: 0, players: [self] });
    expect(updates.at(-1)?.moves).toHaveLength(2);
    expect(states).toEqual(["online"]);
  });

  it("identifies the room by a hash and never sends the room code", async () => {
    const server = createFakeServer();
    await connect(server);
    for (const call of server.calls) {
      expect(call.roomHeader).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(call)).not.toContain(ROOM_CODE);
    }
  });

  it("asks only for moves it has not seen yet", async () => {
    const server = createFakeServer();
    const { updates } = await connect(server);
    server.moves.push(move("bob"));
    await advance(1500);
    expect(server.reads().at(-1)?.query).toBe("?since=0");
    expect(updates.at(-1)).toMatchObject({ firstIndex: 0 });
    server.moves.push(move("alice"));
    await advance(1500);
    expect(server.reads().at(-1)?.query).toBe("?since=1");
    expect(updates.at(-1)?.firstIndex).toBe(1);
  });

  it("reports player changes without new moves", async () => {
    const server = createFakeServer();
    const { updates } = await connect(server);
    server.addPlayer();
    await advance(1500);
    expect(updates.at(-1)?.players).toEqual([self, bob]);
  });

  it("polls quickly while moves happen and slows down when idle", async () => {
    const server = createFakeServer();
    await connect(server);
    const countReadsIn = async (ms: number) => {
      const before = server.reads().length;
      await advance(ms);
      return server.reads().length - before;
    };
    expect(await countReadsIn(15_000)).toBe(10);
    await countReadsIn(120_000);
    expect(await countReadsIn(60_000)).toBeLessThanOrEqual(6);
  });

  it("stops polling while the tab is hidden and polls at once when it returns", async () => {
    const server = createFakeServer();
    const { page } = await connect(server);
    page.setHidden(true);
    const before = server.calls.length;
    await advance(60_000);
    expect(server.calls).toHaveLength(before);
    page.setHidden(false);
    await vi.waitFor(() => {
      expect(server.calls.length).toBeGreaterThan(before);
    });
    expect(server.calls.at(-2)?.query).toBe("?action=join");
  });

  it("renews the presence of the player regularly", async () => {
    const server = createFakeServer();
    await connect(server);
    await advance(60_000);
    const joins = server.calls.filter((call) => call.query === "?action=join");
    expect(joins.length).toBeGreaterThanOrEqual(2);
  });

  it("appends a move with its sequence number", async () => {
    const server = createFakeServer();
    const { transport } = await connect(server);
    const result = await transport.appendMove(0, move("alice"));
    expect(result).toEqual({ kind: "appended" });
    expect(server.calls.at(-1)?.body).toEqual({
      sequence: 0,
      move: move("alice"),
    });
  });

  it("reports a conflict when another move took the sequence number", async () => {
    const server = createFakeServer();
    server.moves.push(move("bob"));
    const { transport } = await connect(server);
    expect(await transport.appendMove(0, move("alice"))).toEqual({
      kind: "conflict",
    });
  });

  it("does not deliver an own move a second time on the next poll", async () => {
    const server = createFakeServer();
    const { transport, updates } = await connect(server);
    await transport.appendMove(0, move("alice"));
    await advance(1500);
    expect(updates.flatMap((update) => update.moves)).toEqual([]);
  });

  it("fails an append while the server is down", async () => {
    const server = createFakeServer();
    const { transport } = await connect(server);
    server.breakDown();
    expect(await transport.appendMove(0, move("alice"))).toEqual({
      kind: "failed",
    });
  });

  it("goes offline after repeated errors, backs off and recovers", async () => {
    const server = createFakeServer();
    const { states } = await connect(server);
    server.breakDown();
    await advance(60_000);
    expect(states).toEqual(["online", "offline"]);
    const attempts = server.calls.length;
    await advance(60_000);
    expect(server.calls.length - attempts).toBeLessThanOrEqual(4);
    server.recover();
    await advance(30_000);
    expect(states).toEqual(["online", "offline", "online"]);
  });

  it("stops talking to the server after leaving", async () => {
    const server = createFakeServer();
    const { transport } = await connect(server);
    transport.leave();
    const before = server.calls.length;
    await advance(60_000);
    expect(server.calls).toHaveLength(before);
  });
});
