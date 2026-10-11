import { describe, expect, it } from "vitest";
import { applyMove, initialGameState, validateMove } from "./applyMove";
import type { Move } from "./moves";
import { expectStarted, readyMoves, startedGame } from "./testFixtures";

describe("ready", () => {
  it("starts playing with the first seat once everyone is ready", () => {
    const started = startedGame(3);
    const state = expectStarted(readyMoves(started).reduce(applyMove, started));
    expect(state.phase).toEqual({
      kind: "playing",
      currentPlayerId: "player-1",
      step: { kind: "awaitingChoice" },
    });
  });

  it("stays in the peek phase until the last player is ready", () => {
    const started = startedGame(3);
    const [firstReady] = readyMoves(started);
    if (!firstReady) {
      throw new Error("Expected a ready move");
    }
    const state = expectStarted(applyMove(started, firstReady));
    expect(state.phase).toEqual({ kind: "initialPeek", readyPlayerIds: ["player-1"] });
  });

  it("does not depend on the order in which players get ready", () => {
    const started = startedGame(4);
    const forward = readyMoves(started);
    const backward = [...forward].reverse();
    const partialForward = forward.slice(1, 3).reduce(applyMove, started);
    const partialBackward = [...forward.slice(1, 3)].reverse().reduce(applyMove, started);
    expect(partialForward).toEqual(partialBackward);
    expect(forward.reduce(applyMove, started)).toEqual(backward.reduce(applyMove, started));
  });

  it("rejects double ready, unknown players and ready outside the peek phase", () => {
    const started = startedGame(2);
    const ready: Move = { type: "ready", playerId: "player-1" };
    expect(validateMove(applyMove(started, ready), ready)).toBe("alreadyReady");
    expect(validateMove(started, { type: "ready", playerId: "stranger" })).toBe("unknownPlayer");
    expect(validateMove(initialGameState, ready)).toBe("gameNotStarted");
    const playing = readyMoves(started).reduce(applyMove, started);
    expect(validateMove(playing, ready)).toBe("wrongPhase");
  });
});
