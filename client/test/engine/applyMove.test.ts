import { describe, expect, it } from "vitest";

import {
  applyMove,
  IllegalMoveError,
  initialGameState,
} from "@/engine/applyMove";
import type { Move } from "@/engine/moves/types";

import { startedGame, startGameMove } from "@test/support/gameFixtures";

describe("applyMove", () => {
  it("throws an error naming the move and the reason of a rejection", () => {
    const move: Move = { type: "drawFromDeck", playerId: "player-1" };
    const attempt = () => applyMove(initialGameState, move);

    expect(attempt).toThrow(IllegalMoveError);
    expect(attempt).toThrow('Illegal move "drawFromDeck": gameNotStarted');
  });

  it("keeps the rejected move on the error", () => {
    const move = startGameMove();
    const error = (() => {
      try {
        applyMove(startedGame(), move);
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(IllegalMoveError);
    expect(error).toMatchObject({ reason: "gameAlreadyStarted", move });
  });

  it("counts every accepted move", () => {
    const state = applyMove(initialGameState, startGameMove());
    expect(state.status === "started" && state.moveCount).toBe(1);
  });
});
