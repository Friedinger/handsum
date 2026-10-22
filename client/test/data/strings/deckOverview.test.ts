import { describe, expect, it } from "vitest";

import {
  deckOverview,
  highestCardValue,
  lowestCardValue,
  powerValues,
} from "@/data/strings/en/deckOverview";
import { standardDeck } from "@/engine/deck";

describe("deck overview", () => {
  it("states the number of cards in the deck", () => {
    expect(deckOverview.total).toBe(
      `${String(standardDeck.length)} cards in total.`,
    );
  });

  it("lists the values with a power per power", () => {
    expect(deckOverview.facts).toContainEqual({
      values: "7 and 8",
      detail: "View own card",
    });
    expect(deckOverview.facts).toContainEqual({
      values: "9 and 10",
      detail: "View other card",
    });
    expect(deckOverview.facts).toContainEqual({
      values: "11 and 12",
      detail: "Blind exchange",
    });
  });

  it("names the lowest and highest card and the values with a power", () => {
    expect(lowestCardValue).toBe(0);
    expect(highestCardValue).toBe(13);
    expect(powerValues).toBe("7 to 12");
  });
});
