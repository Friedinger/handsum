import { describe, expect, it } from "vitest";
import { applyMove, validateMove } from "./applyMove";
import type { Move } from "./moves";
import {
  currentPlayerId,
  expectStarted,
  holding,
  layoutOf,
  makeCard,
  playingGame,
  withLayouts,
} from "@/testing/gameFixtures";
import type { StartedGame } from "./types";

const fives = [
  makeCard(5, null, 1),
  makeCard(5, null, 2),
  makeCard(5, null, 3),
  makeCard(5, null, 4),
];
const drawnCard = makeCard(2, null, 10);
const mixedLayout = [
  makeCard(5, null, 1),
  makeCard(6, null, 2),
  makeCard(5, null, 3),
  makeCard(9, "viewOther", 4),
];

function apply(state: StartedGame, move: Move): StartedGame {
  return expectStarted(applyMove(state, move));
}

function swapDrawn(slotIndices: number[]): Move {
  return { type: "swapDrawnCard", playerId: "player-1", slotIndices };
}

function swapDiscard(slotIndices: number[]): Move {
  return { type: "swapDiscardCard", playerId: "player-1", slotIndices };
}

describe("multi-swap with matching values", () => {
  it("discards all selected cards and places the new card on the lowest selected slot", () => {
    const state = holding(withLayouts(playingGame(), [mixedLayout]), drawnCard);
    const afterSwap = apply(state, swapDrawn([2, 0]));
    expect(layoutOf(afterSwap, 0)).toEqual([
      drawnCard,
      mixedLayout[1],
      null,
      mixedLayout[3],
    ]);
    expect(afterSwap.discardPile.slice(0, 2)).toEqual([
      mixedLayout[2],
      mixedLayout[0],
    ]);
    expect(afterSwap.lastMoveEvents).toEqual([
      {
        type: "cardsRevealed",
        playerId: "player-1",
        slotIndices: [2, 0],
        cards: [mixedLayout[2], mixedLayout[0]],
        matched: true,
      },
    ]);
    expect(currentPlayerId(afterSwap)).toBe("player-2");
  });

  it("can replace all four cards with a single one", () => {
    const state = holding(withLayouts(playingGame(), [fives]), drawnCard);
    const afterSwap = apply(state, swapDrawn([0, 1, 2, 3]));
    expect(layoutOf(afterSwap, 0)).toEqual([drawnCard, null, null, null]);
  });

  it("works with the top card of the discard pile", () => {
    const state = withLayouts(playingGame(), [fives]);
    const takenCard = state.discardPile[0];
    const afterSwap = apply(state, swapDiscard([1, 3]));
    expect(layoutOf(afterSwap, 0)).toEqual([
      fives[0],
      takenCard,
      fives[2],
      null,
    ]);
    expect(afterSwap.discardPile).toEqual([
      fives[1],
      fives[3],
      ...state.discardPile.slice(1),
    ]);
  });
});

describe("multi-swap with differing values", () => {
  it("keeps the layout, discards the drawn card and ends the turn", () => {
    const state = holding(withLayouts(playingGame(), [mixedLayout]), drawnCard);
    const afterSwap = apply(state, swapDrawn([0, 1]));
    expect(layoutOf(afterSwap, 0)).toEqual(mixedLayout);
    expect(afterSwap.discardPile[0]).toEqual(drawnCard);
    expect(afterSwap.lastMoveEvents).toEqual([
      {
        type: "cardsRevealed",
        playerId: "player-1",
        slotIndices: [0, 1],
        cards: [mixedLayout[0], mixedLayout[1]],
        matched: false,
      },
    ]);
    expect(currentPlayerId(afterSwap)).toBe("player-2");
  });

  it("returns a taken discard card to the discard pile", () => {
    const state = withLayouts(playingGame(), [mixedLayout]);
    const afterSwap = apply(state, swapDiscard([0, 1, 2]));
    expect(layoutOf(afterSwap, 0)).toEqual(mixedLayout);
    expect(afterSwap.discardPile).toEqual(state.discardPile);
  });
});

describe("swap selection", () => {
  it("does not reveal anything for a single-card swap", () => {
    const state = holding(withLayouts(playingGame(), [mixedLayout]), drawnCard);
    expect(apply(state, swapDrawn([1])).lastMoveEvents).toEqual([]);
  });

  it("rejects empty, duplicate and empty-slot selections", () => {
    const layoutWithGap = [
      makeCard(5, null, 1),
      null,
      makeCard(5, null, 3),
      makeCard(5, null, 4),
    ];
    const state = holding(
      withLayouts(playingGame(), [layoutWithGap]),
      drawnCard,
    );
    expect(validateMove(state, swapDrawn([]))).toBe("noSlotSelected");
    expect(validateMove(state, swapDrawn([0, 0]))).toBe("duplicateSlot");
    expect(validateMove(state, swapDrawn([1]))).toBe("emptySlot");
    expect(validateMove(state, swapDrawn([0, 1]))).toBe("emptySlot");
  });
});
