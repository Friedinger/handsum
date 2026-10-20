import { describe, expect, it } from "vitest";

import type { Move } from "@/engine/moves/types";
import type { Card, StartedGame } from "@/engine/types";

import {
  applyToStarted,
  currentPlayerId,
  holding,
  layoutOf,
  makeCard,
  playingGame,
  validateMove,
  withLayouts,
} from "@test/support/gameFixtures";

const ownLayout = [
  makeCard(1, null, 1),
  makeCard(2, null, 2),
  makeCard(3, null, 3),
  null,
];
const otherLayout = [
  makeCard(10, "viewOther", 11),
  makeCard(11, "exchangeBlind", 12),
  null,
  makeCard(13, null, 14),
];
const viewOwnCard = makeCard(7, "viewOwn", 20);
const viewOtherCard = makeCard(9, "viewOther", 21);
const exchangeCard = makeCard(12, "exchangeBlind", 22);

function stateHolding(card: Card): StartedGame {
  return holding(withLayouts(playingGame(3), [ownLayout, otherLayout]), card);
}

describe("viewOwnCard", () => {
  const move: Move = {
    type: "viewOwnCard",
    playerId: "player-1",
    slotIndex: 1,
  };

  it("reveals one own card to the player, discards the action card and ends the turn", () => {
    const state = stateHolding(viewOwnCard);
    const afterView = applyToStarted(state, move);
    expect(afterView.lastMoveEvents).toEqual([
      {
        type: "cardViewed",
        viewerId: "player-1",
        ownerId: "player-1",
        slotIndex: 1,
        card: ownLayout[1],
      },
    ]);
    expect(layoutOf(afterView, 0)).toEqual(ownLayout);
    expect(afterView.discardPile[0]).toEqual(viewOwnCard);
    expect(currentPlayerId(afterView)).toBe("player-2");
  });

  it("needs a matching action card that was just drawn", () => {
    expect(validateMove(stateHolding(viewOtherCard), move)).toBe(
      "wrongCardAction",
    );
    expect(validateMove(stateHolding(makeCard(4)), move)).toBe(
      "wrongCardAction",
    );
    expect(validateMove(withLayouts(playingGame(3), [ownLayout]), move)).toBe(
      "wrongTurnStep",
    );
  });

  it("cannot look at an empty slot", () => {
    expect(
      validateMove(stateHolding(viewOwnCard), { ...move, slotIndex: 3 }),
    ).toBe("emptySlot");
  });
});

describe("viewOtherCard", () => {
  const move: Move = {
    type: "viewOtherCard",
    playerId: "player-1",
    targetPlayerId: "player-2",
    slotIndex: 3,
  };

  it("reveals one card of another player to the viewer only", () => {
    const afterView = applyToStarted(stateHolding(viewOtherCard), move);
    expect(afterView.lastMoveEvents).toEqual([
      {
        type: "cardViewed",
        viewerId: "player-1",
        ownerId: "player-2",
        slotIndex: 3,
        card: otherLayout[3],
      },
    ]);
    expect(afterView.discardPile[0]).toEqual(viewOtherCard);
  });

  it("rejects the own seat, unknown players and empty slots", () => {
    const state = stateHolding(viewOtherCard);
    expect(validateMove(state, { ...move, targetPlayerId: "player-1" })).toBe(
      "invalidTarget",
    );
    expect(validateMove(state, { ...move, targetPlayerId: "stranger" })).toBe(
      "invalidTarget",
    );
    expect(validateMove(state, { ...move, slotIndex: 2 })).toBe("emptySlot");
  });
});

describe("exchangeBlind", () => {
  const move: Move = {
    type: "exchangeBlind",
    playerId: "player-1",
    ownSlotIndex: 0,
    targetPlayerId: "player-2",
    targetSlotIndex: 1,
  };

  it("exchanges one own card with one card of another player without revealing them", () => {
    const afterExchange = applyToStarted(stateHolding(exchangeCard), move);
    expect(layoutOf(afterExchange, 0)).toEqual([
      otherLayout[1],
      ownLayout[1],
      ownLayout[2],
      null,
    ]);
    expect(layoutOf(afterExchange, 1)).toEqual([
      otherLayout[0],
      ownLayout[0],
      null,
      otherLayout[3],
    ]);
    expect(afterExchange.lastMoveEvents).toEqual([]);
    expect(afterExchange.discardPile[0]).toEqual(exchangeCard);
  });

  it("rejects empty slots on either side", () => {
    const state = stateHolding(exchangeCard);
    expect(validateMove(state, { ...move, ownSlotIndex: 3 })).toBe("emptySlot");
    expect(validateMove(state, { ...move, targetSlotIndex: 2 })).toBe(
      "emptySlot",
    );
  });
});
