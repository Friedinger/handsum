import { describe, expect, it } from "vitest";
import type { Move, StartGameMove } from "@/engine";
import { appendMove, emptyLog, extendLog, replayLog } from "@/net/moveLog";

const players = [
  { id: "alice", name: "Alice" },
  { id: "bob", name: "Bob" },
];
const start: StartGameMove = {
  type: "startGame",
  playerId: "alice",
  players,
  seed: 42,
};
const aliceViews: Move = {
  type: "viewStartingCards",
  playerId: "alice",
  slotIndices: [0, 1],
};
const bobViews: Move = {
  type: "viewStartingCards",
  playerId: "bob",
  slotIndices: [2, 3],
};

describe("appendMove", () => {
  it("applies a legal move to the log", () => {
    const outcome = appendMove(emptyLog, start);
    expect(outcome.kind === "accepted" && outcome.log.moves).toEqual([start]);
  });

  it("rejects illegal moves with the engine's reason", () => {
    expect(appendMove(emptyLog, aliceViews)).toEqual({
      kind: "rejected",
      reason: "gameNotStarted",
    });
  });
});

describe("replayLog", () => {
  it("rebuilds the state from the moves", () => {
    const log = replayLog([start, aliceViews]);
    expect(log?.moves).toEqual([start, aliceViews]);
    expect(log?.state.status).toBe("started");
  });

  it("refuses a log that contains an illegal move", () => {
    expect(replayLog([start, aliceViews, aliceViews])).toBeNull();
  });
});

describe("extendLog", () => {
  const started = replayLog([start]) ?? emptyLog;

  it("appends moves that follow the known ones", () => {
    const log = extendLog(started, 1, [aliceViews, bobViews]);
    expect(log.moves).toEqual([start, aliceViews, bobViews]);
  });

  it("skips moves it already has", () => {
    const log = extendLog(started, 0, [start, aliceViews]);
    expect(log.moves).toEqual([start, aliceViews]);
  });

  it("ignores a batch that would leave a gap", () => {
    expect(extendLog(started, 2, [bobViews])).toBe(started);
  });

  it("stops at the first illegal move", () => {
    const log = extendLog(started, 1, [aliceViews, aliceViews, bobViews]);
    expect(log.moves).toEqual([start, aliceViews]);
  });

  it("accepts a new start after the game has finished", () => {
    const finished = replayLog([start, aliceViews, bobViews]);
    const state = finished?.state;
    if (state?.status !== "started" || state.phase.kind !== "playing") {
      throw new Error("Expected a running game");
    }
    const first = state.phase.currentPlayerId;
    const second = first === "alice" ? "bob" : "alice";
    const moves: Move[] = [
      start,
      aliceViews,
      bobViews,
      { type: "callEnd", playerId: first },
      { type: "drawFromDeck", playerId: second },
      { type: "discardDrawnCard", playerId: second },
      { ...start, seed: 7 },
    ];
    expect(replayLog(moves)?.moves).toHaveLength(moves.length);
  });
});
