import { describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import { hintFor } from "@/utils/tableHints";
import { type Intent, noIntent } from "@/utils/tableIntent";

import {
  holding,
  makeCard,
  playingGame,
  startedGame,
} from "@test/support/gameFixtures";

const self = "player-1";

describe("hintFor", () => {
  it("asks to pick starting cards, then to wait for the others", () => {
    expect(hintFor(startedGame(2), self, noIntent)).toBe(
      strings.hints.startingView,
    );
  });

  it("explains the choices at the start of a turn and while taking the discard", () => {
    expect(hintFor(playingGame(), self, noIntent)).toBe(strings.hints.choosing);
    const taking = {
      kind: "takingDiscard",
      severalCards: false,
      slotIndices: [],
    } as const;
    expect(hintFor(playingGame(), self, taking)).toBe(
      strings.hints.takingDiscard,
    );
  });

  it("mentions the card action only when the drawn card has one", () => {
    expect(hintFor(holding(playingGame(), makeCard(4)), self, noIntent)).toBe(
      strings.hints.holding,
    );
    const actionCard = holding(playingGame(), makeCard(9, "viewOther"));
    expect(hintFor(actionCard, self, noIntent)).toBe(
      strings.hints.holdingAction,
    );
  });

  it("guides ending the turn once cards are selected", () => {
    const state = holding(playingGame(), makeCard(4));
    const selecting: Intent = { kind: "selectingSwapCards", slotIndices: [1] };
    expect(hintFor(state, self, selecting)).toBe(strings.hints.holdingSelected);
  });

  it("names the player whose turn it is", () => {
    expect(hintFor(playingGame(), "player-2", noIntent)).toBe(
      strings.hints.othersTurn("Player 1"),
    );
  });
});
