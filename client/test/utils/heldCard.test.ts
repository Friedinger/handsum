import { describe, expect, it } from "vitest";
import { strings } from "@/data/strings";
import { holding, makeCard, playingGame } from "@test/support/gameFixtures";
import {
  currentHeldCard,
  heldCardLabel,
  shownHeldCard,
} from "@/utils/heldCard";

const self = "player-1";
const drawn = makeCard(4);

describe("currentHeldCard", () => {
  it("is empty while nobody holds a card", () => {
    expect(currentHeldCard(playingGame(3))).toBeNull();
  });

  it("names the holder and the card", () => {
    expect(currentHeldCard(holding(playingGame(3), drawn))).toEqual({
      holderId: self,
      card: drawn,
    });
  });
});

describe("shownHeldCard", () => {
  const state = playingGame(3);

  it("shows the top discard card as held once it is taken", () => {
    const topDiscard = state.discardPile[0];
    expect(shownHeldCard(state, self, true)).toEqual({
      holderId: self,
      card: topDiscard,
    });
  });

  it("shows the drawn card otherwise", () => {
    const holdingState = holding(state, drawn);
    expect(shownHeldCard(holdingState, self, false)?.card).toBe(drawn);
  });
});

describe("heldCardLabel", () => {
  const state = holding(playingGame(3), drawn);
  const held = currentHeldCard(state);

  it("has no label without a held card", () => {
    expect(heldCardLabel(state, self, null, false)).toBeNull();
  });

  it("labels the own, a taken and another player's card", () => {
    expect(heldCardLabel(state, self, held, false)).toBe(
      strings.table.yourCard,
    );
    expect(heldCardLabel(state, self, held, true)).toBe(
      strings.table.takenCard,
    );
    expect(heldCardLabel(state, "player-2", held, false)).toBe(
      strings.table.holdingCard("Player 1"),
    );
  });
});
