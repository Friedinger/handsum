import { describe, expect, it } from "vitest";

import {
  canToggleSeveral,
  type Intent,
  isSlotMarked,
  isSwappingSeveral,
  noIntent,
  selectedOwnSlots,
  situationOf,
  toggleSeveral,
} from "@/utils/tableIntent";

import { holding, makeCard, playingGame } from "@test/support/gameFixtures";

const self = "player-1";
const takingDiscard: Intent = {
  kind: "takingDiscard",
  severalCards: false,
  slotIndices: [1],
};
const exchange: Intent = {
  kind: "action",
  action: "exchangeBlind",
  ownSlotIndex: 2,
  target: { playerId: "player-2", slotIndex: 3 },
};

describe("situationOf", () => {
  const state = playingGame(3);

  it("lets the current player choose and everyone else wait", () => {
    expect(situationOf(state, self)).toEqual({ kind: "choosing" });
    expect(situationOf(state, "player-2")).toEqual({ kind: "waiting" });
  });

  it("reports the drawn card to the player holding it", () => {
    const card = makeCard(4);
    expect(situationOf(holding(state, card), self)).toEqual({
      kind: "holding",
      card,
    });
  });
});

describe("selectedOwnSlots", () => {
  it("lists the selection of intents that collect slots", () => {
    expect(selectedOwnSlots(takingDiscard)).toEqual([1]);
  });

  it("is empty for intents without a selection", () => {
    expect(selectedOwnSlots(noIntent)).toEqual([]);
    expect(selectedOwnSlots(exchange)).toEqual([]);
  });
});

describe("several cards switch", () => {
  const chooser = situationOf(playingGame(3), self);
  const holder = situationOf(holding(playingGame(3), makeCard(4)), self);

  it("is offered while holding a card or after taking the discard card", () => {
    expect(canToggleSeveral(holder, noIntent)).toBe(true);
    expect(canToggleSeveral(chooser, takingDiscard)).toBe(true);
  });

  it("is hidden when nothing could be swapped yet or an action runs", () => {
    expect(canToggleSeveral(chooser, noIntent)).toBe(false);
    expect(canToggleSeveral(holder, exchange)).toBe(false);
  });

  it("turns on and off again", () => {
    const on = toggleSeveral(noIntent);
    expect(isSwappingSeveral(on)).toBe(true);
    expect(toggleSeveral(on)).toEqual(noIntent);
  });

  it("starts with an empty selection when taking the discard card", () => {
    const on = toggleSeveral(takingDiscard);
    expect(on).toEqual({
      ...takingDiscard,
      severalCards: true,
      slotIndices: [],
    });
    expect(isSwappingSeveral(on)).toBe(true);
  });

  it("leaves other intents unchanged", () => {
    expect(toggleSeveral(exchange)).toBe(exchange);
  });
});

describe("isSlotMarked", () => {
  it("marks selected own slots only", () => {
    expect(
      isSlotMarked(takingDiscard, { playerId: self, slotIndex: 1 }, self),
    ).toBe(true);
    expect(
      isSlotMarked(takingDiscard, { playerId: self, slotIndex: 0 }, self),
    ).toBe(false);
    expect(
      isSlotMarked(takingDiscard, { playerId: "player-2", slotIndex: 1 }, self),
    ).toBe(false);
  });

  it("marks the chosen own and target slots of an action", () => {
    expect(isSlotMarked(exchange, { playerId: self, slotIndex: 2 }, self)).toBe(
      true,
    );
    expect(
      isSlotMarked(exchange, { playerId: "player-2", slotIndex: 3 }, self),
    ).toBe(true);
    expect(
      isSlotMarked(exchange, { playerId: "player-3", slotIndex: 3 }, self),
    ).toBe(false);
    expect(isSlotMarked(exchange, { playerId: self, slotIndex: 3 }, self)).toBe(
      false,
    );
  });
});
