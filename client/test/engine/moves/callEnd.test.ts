import { describe, expect, it } from "vitest";
import { applyMove, validateMove } from "@/engine/applyMove";
import { legalMoves } from "@/engine/legalMoves";
import type { Move } from "@/engine/moves/types";
import {
  currentPlayerId,
  expectStarted,
  playingGame,
} from "@test/support/gameFixtures";
import type { StartedGame } from "@/engine/types";

function apply(state: StartedGame, move: Move): StartedGame {
  return expectStarted(applyMove(state, move));
}

function playQuietTurn(state: StartedGame): StartedGame {
  return apply(state, {
    type: "swapDiscardCard",
    playerId: currentPlayerId(state),
    slotIndices: [0],
  });
}

describe("callEnd", () => {
  it("passes the turn without drawing or discarding", () => {
    const state = playingGame(3);
    const afterCall = apply(state, { type: "callEnd", playerId: "player-1" });
    expect(afterCall.endCallerId).toBe("player-1");
    expect(afterCall.drawPile).toEqual(state.drawPile);
    expect(afterCall.discardPile).toEqual(state.discardPile);
    expect(currentPlayerId(afterCall)).toBe("player-2");
  });

  it("gives every other player exactly one more turn, then finishes", () => {
    const afterSecondTurn = playQuietTurn(playingGame(3));
    const afterCall = apply(afterSecondTurn, {
      type: "callEnd",
      playerId: "player-2",
    });
    const afterThird = playQuietTurn(afterCall);
    expect(currentPlayerId(afterThird)).toBe("player-1");
    const finished = playQuietTurn(afterThird);
    expect(finished.phase.kind).toBe("finished");
  });

  it("finishes after one turn in a two-player game", () => {
    const afterCall = apply(playingGame(2), {
      type: "callEnd",
      playerId: "player-1",
    });
    expect(playQuietTurn(afterCall).phase.kind).toBe("finished");
  });

  it("can only be called once and only at the start of a turn", () => {
    const afterCall = apply(playingGame(3), {
      type: "callEnd",
      playerId: "player-1",
    });
    expect(
      validateMove(afterCall, { type: "callEnd", playerId: "player-2" }),
    ).toBe("endAlreadyCalled");
    const afterDraw = apply(playingGame(3), {
      type: "drawFromDeck",
      playerId: "player-1",
    });
    expect(
      validateMove(afterDraw, { type: "callEnd", playerId: "player-1" }),
    ).toBe("wrongTurnStep");
  });

  it("allows no further moves once the game is finished", () => {
    const finished = playQuietTurn(
      apply(playingGame(2), { type: "callEnd", playerId: "player-1" }),
    );
    expect(legalMoves(finished, "player-1")).toEqual([]);
    expect(legalMoves(finished, "player-2")).toEqual([]);
  });
});
