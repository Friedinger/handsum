import { describe, expect, it } from "vitest";
import { applyMove, initialGameState, validateMove } from "./applyMove";
import type { Move } from "./moves";
import { expectStarted, startedGame, startingViewMoves } from "./testFixtures";

function viewMove(playerId: string, slotIndices: number[]): Move {
  return { type: "viewStartingCards", playerId, slotIndices };
}

describe("viewStartingCards", () => {
  it("starts playing once everyone has viewed their cards", () => {
    const started = startedGame(3);
    const state = expectStarted(startingViewMoves(started).reduce(applyMove, started));
    expect(state.phase.kind === "playing" && state.phase.step).toEqual({ kind: "awaitingChoice" });
  });

  it("picks the starting player from the seed", () => {
    const startingPlayers = new Set(
      Array.from({ length: 20 }, (_, seed) => {
        const started = startedGame(4, seed);
        const state = expectStarted(startingViewMoves(started).reduce(applyMove, started));
        return state.phase.kind === "playing" ? state.phase.currentPlayerId : null;
      }),
    );
    expect(startingPlayers).toEqual(new Set(["player-1", "player-2", "player-3", "player-4"]));
  });

  it("waits until the last player has viewed their cards", () => {
    const state = expectStarted(applyMove(startedGame(3), viewMove("player-2", [1, 2])));
    expect(state.phase).toEqual({ kind: "startingView", viewedPlayerIds: ["player-2"] });
    expect(state.lastMoveEvents).toEqual([]);
  });

  it("does not depend on the order in which players view their cards", () => {
    const started = startedGame(4);
    const forward = startingViewMoves(started);
    const backward = [...forward].reverse();
    const partialForward = forward.slice(1, 3).reduce(applyMove, started);
    const partialBackward = [...forward.slice(1, 3)].reverse().reduce(applyMove, started);
    expect(partialForward).toEqual(partialBackward);
    expect(forward.reduce(applyMove, started)).toEqual(backward.reduce(applyMove, started));
  });

  it("requires exactly two different own cards", () => {
    const state = startedGame(2);
    expect(validateMove(state, viewMove("player-1", [0]))).toBe("wrongCardCount");
    expect(validateMove(state, viewMove("player-1", [0, 1, 2]))).toBe("wrongCardCount");
    expect(validateMove(state, viewMove("player-1", [2, 2]))).toBe("duplicateSlot");
    expect(validateMove(state, viewMove("player-1", [0, 4]))).toBe("invalidSlot");
  });

  it("allows viewing only once, only for seated players and only before playing", () => {
    const started = startedGame(2);
    const move = viewMove("player-1", [0, 1]);
    expect(validateMove(applyMove(started, move), move)).toBe("alreadyViewed");
    expect(validateMove(started, viewMove("stranger", [0, 1]))).toBe("unknownPlayer");
    expect(validateMove(initialGameState, move)).toBe("gameNotStarted");
    const playing = startingViewMoves(started).reduce(applyMove, started);
    expect(validateMove(playing, move)).toBe("wrongPhase");
  });
});
