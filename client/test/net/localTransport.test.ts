import { describe, expect, it, vi } from "vitest";

import type { Move } from "@/engine";
import { createLocalRoom } from "@/net/localTransport";
import type { HelloMessage } from "@/net/protocol";
import type { RoomUpdate, TransportHandlers } from "@/net/transport";

const alice: HelloMessage = { playerId: "alice", name: "Alice" };
const bob: HelloMessage = { playerId: "bob", name: "Bob" };
const move: Move = { type: "callEnd", playerId: "alice" };

function recordingHandlers() {
  const updates: RoomUpdate[] = [];
  const handlers: TransportHandlers = {
    onUpdate: (update) => updates.push(update),
    onConnectionChange: vi.fn(),
    onJoinRefusedChange: vi.fn(),
  };
  return { handlers, updates };
}

describe("local room", () => {
  it("is online right away and lists everyone who joined", () => {
    const connect = createLocalRoom();
    const first = recordingHandlers();
    const second = recordingHandlers();

    connect("room", alice, first.handlers);
    connect("room", bob, second.handlers);

    expect(first.handlers.onConnectionChange).toHaveBeenCalledWith("online");
    expect(first.updates.at(-1)?.players).toEqual([alice, bob]);
    expect(second.updates.at(-1)?.players).toEqual([alice, bob]);
  });

  it("appends the next move and passes it on to everyone", async () => {
    const connect = createLocalRoom();
    const first = recordingHandlers();
    const second = recordingHandlers();
    const transport = connect("room", alice, first.handlers);
    connect("room", bob, second.handlers);

    const result = await transport.appendMove(0, move);
    await Promise.resolve();

    expect(result).toEqual({ kind: "appended" });
    expect(second.updates.at(-1)).toMatchObject({
      firstIndex: 0,
      moves: [move],
    });
    expect(first.updates.at(-1)).toMatchObject({
      firstIndex: 0,
      moves: [move],
    });
  });

  it("reports a conflict for a move that is not the next free one", async () => {
    const transport = createLocalRoom()(
      "room",
      alice,
      recordingHandlers().handlers,
    );

    expect(await transport.appendMove(1, move)).toEqual({ kind: "conflict" });
  });

  it("lets a latecomer catch up on all moves so far", async () => {
    const connect = createLocalRoom();
    const early = connect("room", alice, recordingHandlers().handlers);
    await early.appendMove(0, move);
    const late = recordingHandlers();

    connect("room", bob, late.handlers);

    expect(late.updates.at(-1)).toMatchObject({ firstIndex: 0, moves: [move] });
  });

  it("keeps separate local rooms apart", async () => {
    const first = createLocalRoom()(
      "room",
      alice,
      recordingHandlers().handlers,
    );
    await first.appendMove(0, move);
    const other = recordingHandlers();

    createLocalRoom()("room", bob, other.handlers);

    expect(other.updates.at(-1)?.moves).toEqual([]);
  });
});
