import { describe, expect, it } from "vitest";
import type { Move, StartGameMove } from "../engine";
import { adoptLongerLog, emptyLog, receiveMove, replayLog, type SyncedLog } from "./moveLog";
import type { HelloMessage } from "./protocol";

const host: HelloMessage = { playerId: "alice", name: "Alice", isHost: true };
const guest: HelloMessage = { playerId: "bob", name: "Bob", isHost: false };

const startGame: StartGameMove = {
  type: "startGame",
  playerId: "alice",
  players: [
    { id: "alice", name: "Alice" },
    { id: "bob", name: "Bob" },
  ],
  seed: 42,
};
const aliceReady: Move = { type: "ready", playerId: "alice" };
const bobReady: Move = { type: "ready", playerId: "bob" };

function logOf(moves: Move[]): SyncedLog {
  const log = replayLog(moves);
  if (!log) {
    throw new Error("Expected a valid log");
  }
  return log;
}

describe("receiveMove", () => {
  it("appends a legal move with the expected sequence number", () => {
    const outcome = receiveMove(emptyLog, { sequence: 1, move: startGame }, host);
    expect(outcome.kind).toBe("appended");
  });

  it("ignores a move it already has", () => {
    const log = logOf([startGame]);
    expect(receiveMove(log, { sequence: 1, move: startGame }, host)).toEqual({ kind: "duplicate" });
  });

  it("reports being behind when a sequence number is skipped", () => {
    expect(receiveMove(emptyLog, { sequence: 2, move: aliceReady }, host)).toEqual({
      kind: "behind",
    });
  });

  it("rejects moves for another player and game starts by guests", () => {
    expect(receiveMove(emptyLog, { sequence: 1, move: startGame }, guest)).toEqual({
      kind: "rejected",
      reason: "wrongSender",
    });
    const guestStart = { ...startGame, playerId: "bob" };
    expect(receiveMove(emptyLog, { sequence: 1, move: guestStart }, guest)).toEqual({
      kind: "rejected",
      reason: "notHost",
    });
  });

  it("rejects illegal moves with the engine's reason", () => {
    const log = logOf([startGame]);
    const draw: Move = { type: "drawFromDeck", playerId: "bob" };
    expect(receiveMove(log, { sequence: 2, move: draw }, guest)).toEqual({
      kind: "rejected",
      reason: "wrongPhase",
    });
  });

  it("appends a concurrent ready move that lost the race for its sequence number", () => {
    const aliceView = logOf([startGame, aliceReady]);
    const outcome = receiveMove(aliceView, { sequence: 2, move: bobReady }, guest);
    if (outcome.kind !== "appended") {
      throw new Error("Expected the ready move to be appended");
    }
    const bobView = logOf([startGame, bobReady, aliceReady]);
    expect(outcome.log.state).toEqual(bobView.state);
  });

  it("rejects other moves with an outdated sequence number", () => {
    const log = logOf([startGame, aliceReady, bobReady]);
    const draw: Move = { type: "drawFromDeck", playerId: "alice" };
    expect(receiveMove(log, { sequence: 2, move: draw }, host)).toEqual({
      kind: "rejected",
      reason: "staleSequence",
    });
  });
});

describe("adoptLongerLog", () => {
  it("adopts a longer valid log", () => {
    const adopted = adoptLongerLog(logOf([startGame]), [startGame, aliceReady]);
    expect(adopted?.moves).toEqual([startGame, aliceReady]);
  });

  it("keeps the own log when the incoming one is not longer or invalid", () => {
    const own = logOf([startGame, aliceReady]);
    expect(adoptLongerLog(own, [startGame])).toBeNull();
    expect(adoptLongerLog(own, [startGame, aliceReady, aliceReady])).toBeNull();
  });
});
