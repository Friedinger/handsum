import { describe, expect, it } from "vitest";
import { applyMove, validateMove } from "./applyMove";
import type { Move } from "./moves";
import { expectStarted, makeCard, playingGame } from "./testFixtures";
import type { StartedGame } from "./types";

const drawMove: Move = { type: "drawFromDeck", playerId: "player-1" };
const discardPile = [
  makeCard(1, null, 1),
  makeCard(2, null, 2),
  makeCard(3, null, 3),
  makeCard(4, null, 4),
];

function withEmptyDrawPile(
  state: StartedGame,
  pile = discardPile,
): StartedGame {
  return { ...state, drawPile: [], discardPile: pile };
}

describe("empty draw pile", () => {
  it("reshuffles the discard pile except its top card before drawing", () => {
    const afterDraw = expectStarted(
      applyMove(withEmptyDrawPile(playingGame()), drawMove),
    );
    expect(afterDraw.discardPile).toEqual([discardPile[0]]);
    expect(afterDraw.drawPile).toHaveLength(2);
    expect(afterDraw.lastMoveEvents).toEqual([
      { type: "drawPileReshuffled", cardCount: 3 },
    ]);
    if (
      afterDraw.phase.kind !== "playing" ||
      afterDraw.phase.step.kind !== "holdingDrawnCard"
    ) {
      throw new Error("Expected a drawn card");
    }
    const drawnAndRemaining = [
      afterDraw.phase.step.card,
      ...afterDraw.drawPile,
    ];
    expect(drawnAndRemaining.map((card) => card.value).sort()).toEqual([
      2, 3, 4,
    ]);
  });

  it("reshuffles deterministically from seed and move number", () => {
    const state = withEmptyDrawPile(playingGame());
    expect(applyMove(state, drawMove)).toEqual(applyMove(state, drawMove));
  });

  it("cannot draw when only the top discard card is left", () => {
    const state = withEmptyDrawPile(playingGame(), [makeCard(5)]);
    expect(validateMove(state, drawMove)).toBe("drawPileEmpty");
  });
});
