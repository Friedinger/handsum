import { describe, expect, it } from "vitest";
import type { GameState, Move, StartedGame } from "@/engine";
import {
  createGameSession,
  lobbyPlayers,
  type GameSession,
  type SessionSnapshot,
} from "@/net/gameSession";
import {
  createMemoryNetwork,
  type MemoryNetwork,
} from "@test/support/memoryNetwork";
import type { HelloMessage } from "@/net/protocol";

const ROOM = "ABCDEF";
const SEED = 7;
const alice: HelloMessage = { playerId: "alice", name: "Alice" };
const bob: HelloMessage = { playerId: "bob", name: "Bob" };
const carol: HelloMessage = { playerId: "carol", name: "Carol" };

interface Client {
  readonly session: GameSession;
  readonly latest: () => SessionSnapshot;
}

function join(network: MemoryNetwork, self: HelloMessage): Client {
  let latest: SessionSnapshot | null = null;
  const session = createGameSession({
    roomCode: ROOM,
    self,
    connect: network.connect,
    onChange: (snapshot) => {
      latest = snapshot;
    },
  });
  return {
    session,
    latest: () => {
      if (!latest) {
        throw new Error("No snapshot yet");
      }
      return latest;
    },
  };
}

async function startedRoom() {
  const network = createMemoryNetwork();
  const host = join(network, alice);
  const guest = join(network, bob);
  await network.deliverAll();
  host.session.startGame(SEED);
  await settle(network);
  return { network, host, guest };
}

function expectStartedState(state: GameState): StartedGame {
  if (state.status !== "started") {
    throw new Error("Expected a started game");
  }
  return state;
}

// Moves reach the server asynchronously, so give pending requests time to finish first.
async function settle(network: MemoryNetwork): Promise<void> {
  await Promise.resolve();
  await network.deliverAll();
}

function currentPlayer(client: Client): string {
  const { phase } = expectStartedState(client.latest().log.state);
  if (phase.kind !== "playing") {
    throw new Error("Expected a running game");
  }
  return phase.currentPlayerId;
}

async function playUntilFinished(
  network: MemoryNetwork,
  clients: readonly Client[],
): Promise<void> {
  const turnOf = (playerId: string) =>
    clients.find((client) => client.latest().self.playerId === playerId);
  const caller = currentPlayer(clients[0] ?? fail());
  turnOf(caller)?.session.submitMove({ type: "callEnd", playerId: caller });
  await settle(network);
  const last = currentPlayer(clients[0] ?? fail());
  turnOf(last)?.session.submitMove({ type: "drawFromDeck", playerId: last });
  await settle(network);
  turnOf(last)?.session.submitMove({
    type: "discardDrawnCard",
    playerId: last,
  });
  await settle(network);
}

function fail(): never {
  throw new Error("Expected a client");
}

const ready = (playerId: string): Move => ({
  type: "viewStartingCards",
  playerId,
  slotIndices: [0, 1],
});

describe("game session", () => {
  it("lists everyone in the lobby in the order they joined", async () => {
    const network = createMemoryNetwork();
    const host = join(network, alice);
    join(network, bob);
    await network.deliverAll();
    expect(lobbyPlayers(host.latest())).toEqual([
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ]);
  });

  it("shares a start by any player with everyone", async () => {
    const network = createMemoryNetwork();
    const host = join(network, alice);
    const guest = join(network, bob);
    await network.deliverAll();
    guest.session.startGame(SEED);
    await settle(network);
    expect(host.latest().log.state.status).toBe("started");
    expect(host.latest().log.moves).toEqual(guest.latest().log.moves);
  });

  it("lets the first start win when two players start at the same time", async () => {
    const network = createMemoryNetwork();
    const first = join(network, alice);
    const second = join(network, bob);
    await network.deliverAll();
    first.session.startGame(SEED);
    second.session.startGame(SEED + 1);
    await settle(network);
    await settle(network);
    expect(first.latest().log.moves).toEqual(second.latest().log.moves);
    expect(first.latest().log.moves).toHaveLength(1);
    expect(first.latest().log.moves[0]?.playerId).toBe("alice");
  });

  it("keeps both clients in sync when players view their cards at the same time", async () => {
    const { network, host, guest } = await startedRoom();
    host.session.submitMove(ready("alice"));
    guest.session.submitMove(ready("bob"));
    await settle(network);
    await settle(network);
    expect(host.latest().log.state).toEqual(guest.latest().log.state);
    const { state } = host.latest().log;
    expect(state.status === "started" && state.phase.kind).toBe("playing");
  });

  it("rejects local moves the rules do not allow", async () => {
    const { guest } = await startedRoom();
    expect(
      guest.session.submitMove({ type: "drawFromDeck", playerId: "bob" }),
    ).toBe("wrongPhase");
  });

  it("restores the full game for a player who reloads", async () => {
    const { network, host, guest } = await startedRoom();
    host.session.submitMove(ready("alice"));
    await settle(network);
    guest.session.leave();
    const rejoined = join(network, bob);
    await network.deliverAll();
    expect(rejoined.latest().log.moves).toEqual(host.latest().log.moves);
    expect(rejoined.latest().players.map((player) => player.playerId)).toEqual([
      "alice",
      "bob",
    ]);
  });

  it("catches up a client that joined after the game started", async () => {
    const { network, host, guest } = await startedRoom();
    const latecomer = join(network, carol);
    await network.deliverAll();
    host.session.submitMove(ready("alice"));
    guest.session.submitMove(ready("bob"));
    await settle(network);
    await settle(network);
    expect(latecomer.latest().log.state).toEqual(host.latest().log.state);
  });

  it("starts a rematch with the same players in the same room", async () => {
    const { network, host, guest } = await startedRoom();
    host.session.submitMove(ready("alice"));
    guest.session.submitMove(ready("bob"));
    await settle(network);
    await settle(network);
    await playUntilFinished(network, [host, guest]);
    guest.session.startGame(SEED + 2);
    await settle(network);
    const rematch = expectStartedState(host.latest().log.state);
    expect(rematch.phase.kind).toBe("startingView");
    expect(rematch.seats.map((seat) => seat.player.id)).toEqual([
      "alice",
      "bob",
    ]);
    expect(rematch).toEqual(guest.latest().log.state);
  });
});
