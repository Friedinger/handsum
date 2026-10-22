import { describe, expect, it } from "vitest";

import cardData from "@/data/cards.json";
import {
  deckOverview,
  describeDeck,
  describeValues,
  highestCardValue,
  lowestCardValue,
  powerValues,
} from "@/data/strings/deckOverview";
import { standardDeck } from "@/engine/deck";

describe("describeValues", () => {
  it("names single values, pairs and ranges", () => {
    expect(describeValues([4])).toBe("4");
    expect(describeValues([0, 13])).toBe("0 and 13");
    expect(describeValues([1, 2, 3, 4])).toBe("1 to 4");
    expect(describeValues([3, 0, 1, 7])).toBe("0 and 1, 3 and 7");
  });
});

describe("deck overview", () => {
  it("states the number of cards in the deck", () => {
    expect(deckOverview[0]).toBe(
      `${String(standardDeck.length)} cards in total.`,
    );
  });

  it("groups values with the same count", () => {
    expect(
      describeDeck([
        { value: 0, count: 2, points: 0, action: null },
        { value: 1, count: 4, points: 1, action: null },
        { value: 2, count: 4, points: 2, action: null },
        { value: 3, count: 2, points: 3, action: null },
      ]),
    ).toEqual(["12 cards in total.", "1 and 2: 4 each", "0 and 3: 2 each"]);
  });

  it("lists the values with a power per power", () => {
    expect(deckOverview).toContain("7 and 8: View own card");
    expect(deckOverview).toContain("9 and 10: View other card");
    expect(deckOverview).toContain("11 and 12: Blind exchange");
  });

  it("matches the card data", () => {
    const values = cardData.cardTypes.map((type) => type.value);
    expect(lowestCardValue).toBe(Math.min(...values));
    expect(highestCardValue).toBe(Math.max(...values));
    expect(powerValues).toBe("7 to 12");
  });
});
