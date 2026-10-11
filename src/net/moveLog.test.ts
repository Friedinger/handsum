import { describe, expect, it } from "vitest";
import type { Move, StartGameMove } from "../engine";
import { chooseLog, emptyLog, receiveMove, replayLog, type SyncedLog } from "./moveLog";
import type { HelloMessage, MoveMessage } from "./protocol";

const alice: HelloMessage = { playerId: "alice", name: "Alice" };
const bob: HelloMessage = { playerId: "bob", name: "Bob" };

const players = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
];
const aliceStart: StartGameMove = { type: "startGame", playerId: "alice", players, seed: 42 };
const bobStart: StartGameMove = { type: "startGame", playerId: "bob", players, seed: 99 };
const aliceViews: Move = { type: "viewStartingCards", playerId: "alice", slotIndices: [0, 1] };
const bobViews: Move = { type: "viewStartingCards", playerId: "bob", slotIndices: [2, 3] };

function logOf(moves: Move[]): SyncedLog {
  const log = replayLog(moves);
  if (!log) {
    throw new Error("Expected a valid log");
  }
  return log;
}

function message(sequence: number, move: Move, startSeed = aliceStart.seed): MoveMessage {
  return { startSeed, sequence, move };
}

describe("receiveMove", () => {
  it("accepts a legal move with the expected sequence number", () => {
    expect(receiveMove(emptyLog, message(1, aliceStart), alice).kind).toBe("accepted");
  });

  it("ignores a move it already has", () => {
    const log = logOf([aliceStart]);
    expect(receiveMove(log, message(1, aliceStart), alice)).toEqual({ kind: "duplicate" });
  });

  it("reports being behind when a sequence number is skipped", () => {
    expect(receiveMove(emptyLog, message(2, aliceViews), alice)).toEqual({ kind: "behind" });
  });

  it("rejects moves sent on behalf of another player", () => {
    expect(receiveMove(emptyLog, message(1, aliceStart), bob)).toEqual({
      kind: "rejected",
      reason: "wrongSender",
    });
  });

  it("rejects moves that belong to a different game start", () => {
    const log = logOf([aliceStart]);
    expect(receiveMove(log, message(2, bobViews, bobStart.seed), bob)).toEqual({
      kind: "rejected",
      reason: "otherGame",
    });
  });

  it("rejects illegal moves with the engine's reason", () => {
    const log = logOf([aliceStart]);
    const draw: Move = { type: "drawFromDeck", playerId: "bob" };
    expect(receiveMove(log, message(2, draw), bob)).toEqual({
      kind: "rejected",
      reason: "wrongPhase",
    });
  });

  it("appends concurrent starting views that lost the race for their sequence number", () => {
    const aliceLog = logOf([aliceStart, aliceViews]);
    const outcome = receiveMove(aliceLog, message(2, bobViews), bob);
    if (outcome.kind !== "accepted") {
      throw new Error("Expected the starting view to be accepted");
    }
    expect(outcome.log.state).toEqual(logOf([aliceStart, bobViews, aliceViews]).state);
  });

  it("settles crossing starts in favour of the lower player ID", () => {
    const outcome = receiveMove(logOf([bobStart]), message(1, aliceStart), alice);
    expect(outcome.kind === "accepted" && outcome.log.moves).toEqual([aliceStart]);
    expect(receiveMove(logOf([aliceStart]), message(1, bobStart, bobStart.seed), bob)).toEqual({
      kind: "rejected",
      reason: "gameAlreadyStarted",
    });
  });

  it("rejects other moves with an outdated sequence number", () => {
    const log = logOf([aliceStart, aliceViews, bobViews]);
    const draw: Move = { type: "drawFromDeck", playerId: "alice" };
    expect(receiveMove(log, message(2, draw), alice)).toEqual({
      kind: "rejected",
      reason: "staleSequence",
    });
  });
});

describe("chooseLog", () => {
  it("adopts a longer valid log of the same game", () => {
    expect(chooseLog(logOf([aliceStart]), [aliceStart, aliceViews])?.moves).toEqual([
      aliceStart,
      aliceViews,
    ]);
  });

  it("keeps the own log when the incoming one is not longer or invalid", () => {
    const own = logOf([aliceStart, aliceViews]);
    expect(chooseLog(own, [aliceStart])).toBeNull();
    expect(chooseLog(own, [aliceStart, aliceViews, aliceViews])).toBeNull();
  });

  it("prefers the winning start over a longer log of the losing start", () => {
    const losing = logOf([bobStart, bobViews]);
    expect(chooseLog(losing, [aliceStart])?.moves).toEqual([aliceStart]);
    expect(chooseLog(logOf([aliceStart]), [bobStart, bobViews])).toBeNull();
  });
});

describe("rematches", () => {
  const startedMoves: Move[] = [aliceStart, aliceViews, bobViews];

  function finishedLog(): SyncedLog {
    const started = logOf(startedMoves);
    const { state } = started;
    if (state.status !== "started" || state.phase.kind !== "playing") {
      throw new Error("Expected a running game");
    }
    const first = state.phase.currentPlayerId;
    const second = first === "alice" ? "bob" : "alice";
    return logOf([
      ...startedMoves,
      { type: "callEnd", playerId: first },
      { type: "drawFromDeck", playerId: second },
      { type: "discardDrawnCard", playerId: second },
    ]);
  }

  const aliceRematch: StartGameMove = { ...aliceStart, seed: 7 };
  const bobRematch: StartGameMove = { ...bobStart, seed: 8 };

  it("accepts a new start after the game has finished", () => {
    const log = finishedLog();
    expect(log.state.status === "started" && log.state.phase.kind).toBe("finished");
    const outcome = receiveMove(log, message(log.moves.length + 1, bobRematch), bob);
    expect(outcome.kind).toBe("accepted");
  });

  it("checks later moves against the seed of the latest start", () => {
    const log = finishedLog();
    const rematch = logOf([...log.moves, aliceRematch]);
    const views: Move = { type: "viewStartingCards", playerId: "bob", slotIndices: [0, 1] };
    const sequence = rematch.moves.length + 1;
    expect(receiveMove(rematch, message(sequence, views, aliceStart.seed), bob)).toEqual({
      kind: "rejected",
      reason: "otherGame",
    });
    expect(receiveMove(rematch, message(sequence, views, aliceRematch.seed), bob).kind).toBe(
      "accepted",
    );
  });

  it("settles crossing rematches in favour of the lower player ID", () => {
    const log = finishedLog();
    const sequence = log.moves.length + 1;
    const bobFirst = logOf([...log.moves, bobRematch]);
    const outcome = receiveMove(bobFirst, message(sequence, aliceRematch), alice);
    expect(outcome.kind === "accepted" && outcome.log.moves.at(-1)).toEqual(aliceRematch);
    expect(chooseLog(bobFirst, [...log.moves, aliceRematch])?.moves.at(-1)).toEqual(aliceRematch);
  });
});
