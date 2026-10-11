import { describe, expect, it } from "vitest";
import type { StartedGame } from "../engine";
import { holding, makeCard, playingGame, startedGame } from "../engine/testFixtures";
import {
  handleClick,
  isClickable,
  noIntent,
  type ClickTarget,
  type Intent,
  type SlotRef,
} from "./tableInteraction";

const self = "player-1";
const own = (slotIndex: number): ClickTarget => ({
  kind: "slot",
  slot: { playerId: self, slotIndex },
});
const other = (slotIndex: number): ClickTarget => ({
  kind: "slot",
  slot: { playerId: "player-2", slotIndex } satisfies SlotRef,
});
const drawPile: ClickTarget = { kind: "drawPile" };
const discardPile: ClickTarget = { kind: "discardPile" };
const heldCard: ClickTarget = { kind: "heldCard" };

function clickAll(state: StartedGame, targets: ClickTarget[], start: Intent = noIntent) {
  let intent = start;
  for (const target of targets) {
    const outcome = handleClick(state, self, intent, target);
    if (outcome.move) {
      return outcome.move;
    }
    intent = outcome.intent;
  }
  return intent;
}

describe("starting cards", () => {
  it("views two own cards as soon as the second one is clicked", () => {
    expect(clickAll(startedGame(2), [own(0), other(1), own(3)])).toEqual({
      type: "viewStartingCards",
      playerId: self,
      slotIndices: [0, 3],
    });
  });

  it("lets the player change their mind before the second click", () => {
    expect(clickAll(startedGame(2), [own(0), own(0), own(2), own(1)])).toEqual({
      type: "viewStartingCards",
      playerId: self,
      slotIndices: [2, 1],
    });
  });
});

describe("start of a turn", () => {
  it("draws when the draw pile is clicked", () => {
    expect(clickAll(playingGame(), [drawPile])).toEqual({ type: "drawFromDeck", playerId: self });
  });

  it("swaps the selected cards with the discard when the discard pile is clicked", () => {
    expect(clickAll(playingGame(), [own(1), own(2), discardPile])).toEqual({
      type: "swapDiscardCard",
      playerId: self,
      slotIndices: [1, 2],
    });
  });

  it("needs a selection before the discard pile can be clicked", () => {
    const state = playingGame();
    expect(isClickable(state, self, noIntent, discardPile)).toBe(false);
    expect(isClickable(state, self, noIntent, heldCard)).toBe(false);
    expect(isClickable(state, self, noIntent, other(0))).toBe(false);
  });

  it("ignores every click while it is someone else's turn", () => {
    expect(isClickable(playingGame(), "player-2", noIntent, drawPile)).toBe(false);
  });
});

describe("holding a drawn card", () => {
  const plain = holding(playingGame(), makeCard(4));

  it("discards it when the discard pile is clicked", () => {
    expect(clickAll(plain, [discardPile])).toEqual({ type: "discardDrawnCard", playerId: self });
  });

  it("swaps it into the selected slots when the drawn card is clicked", () => {
    expect(clickAll(plain, [own(3), heldCard])).toEqual({
      type: "swapDrawnCard",
      playerId: self,
      slotIndices: [3],
    });
  });

  it("starts the card action when the drawn card is clicked without a selection", () => {
    const viewOther = holding(playingGame(), makeCard(9, "viewOther"));
    expect(clickAll(viewOther, [heldCard, own(0), other(2)])).toEqual({
      type: "viewOtherCard",
      playerId: self,
      targetPlayerId: "player-2",
      slotIndex: 2,
    });
    expect(isClickable(plain, self, noIntent, heldCard)).toBe(false);
  });

  it("views an own card with the matching action", () => {
    const viewOwn = holding(playingGame(), makeCard(7, "viewOwn"));
    expect(clickAll(viewOwn, [heldCard, other(0), own(1)])).toEqual({
      type: "viewOwnCard",
      playerId: self,
      slotIndex: 1,
    });
  });

  it("needs one own and one other card for a blind exchange, in any order", () => {
    const exchange = holding(playingGame(), makeCard(11, "exchangeBlind"));
    expect(clickAll(exchange, [heldCard, other(3), own(0)])).toEqual({
      type: "exchangeBlind",
      playerId: self,
      ownSlotIndex: 0,
      targetPlayerId: "player-2",
      targetSlotIndex: 3,
    });
  });

  it("cancels an action when the drawn card is clicked again", () => {
    const exchange = holding(playingGame(), makeCard(11, "exchangeBlind"));
    expect(clickAll(exchange, [heldCard, heldCard])).toEqual(noIntent);
  });
});
