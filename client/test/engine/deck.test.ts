import { describe, expect, it } from "vitest";

import {
  arrangeDeck,
  buildDeck,
  parseCardTypes,
  standardDeck,
} from "@/engine/deck";

const STANDARD_DECK_SIZE = 52;

function countByValue(value: number): number {
  return standardDeck.filter((card) => card.value === value).length;
}

describe("standardDeck", () => {
  it("has 52 cards with unique ids", () => {
    expect(standardDeck).toHaveLength(STANDARD_DECK_SIZE);
    expect(new Set(standardDeck.map((card) => card.id)).size).toBe(
      STANDARD_DECK_SIZE,
    );
  });

  it("has two each of 0 and 13 and four each of 1 to 12", () => {
    expect(countByValue(0)).toBe(2);
    expect(countByValue(13)).toBe(2);
    for (let value = 1; value <= 12; value++) {
      expect(countByValue(value)).toBe(4);
    }
  });

  it("assigns actions to 7 to 12 only", () => {
    const actionOf = (value: number) =>
      standardDeck.find((card) => card.value === value)?.action;
    expect(actionOf(7)).toBe("viewOwn");
    expect(actionOf(8)).toBe("viewOwn");
    expect(actionOf(9)).toBe("viewOther");
    expect(actionOf(10)).toBe("viewOther");
    expect(actionOf(11)).toBe("exchangeBlind");
    expect(actionOf(12)).toBe("exchangeBlind");
    const plainValues = [0, 1, 2, 3, 4, 5, 6, 13];
    expect(plainValues.every((value) => actionOf(value) === null)).toBe(true);
  });

  it("scores each card by its printed value", () => {
    expect(standardDeck.every((card) => card.points === card.value)).toBe(true);
  });
});

describe("parseCardTypes", () => {
  it("uses explicit points when given", () => {
    const [cardType] = parseCardTypes({
      cardTypes: [{ value: 13, count: 1, points: 20, action: null }],
    });
    expect(cardType?.points).toBe(20);
  });

  it("rejects malformed data", () => {
    expect(() => parseCardTypes({})).toThrow();
    expect(() =>
      parseCardTypes({ cardTypes: [{ value: -1, count: 1, action: null }] }),
    ).toThrow();
    expect(() =>
      parseCardTypes({ cardTypes: [{ value: 1, count: 1, action: "fly" }] }),
    ).toThrow();
  });
});

describe("buildDeck", () => {
  it("creates count copies per card type with sequential ids", () => {
    const deck = buildDeck([
      { value: 1, count: 2, points: 1, action: null },
      { value: 2, count: 1, points: 2, action: "viewOwn" },
    ]);
    expect(deck).toEqual([
      { id: 0, value: 1, points: 1, action: null },
      { id: 1, value: 1, points: 1, action: null },
      { id: 2, value: 2, points: 2, action: "viewOwn" },
    ]);
  });
});

describe("arrangeDeck", () => {
  const values = standardDeck.map((card) => card.value);
  const reversed = [...values].reverse();

  it("puts the standard cards in the given order", () => {
    expect(arrangeDeck(reversed)?.map((card) => card.value)).toEqual(reversed);
  });

  it("gives equal values different cards", () => {
    const ids = arrangeDeck(reversed)?.map((card) => card.id) ?? [];
    expect(new Set(ids).size).toBe(STANDARD_DECK_SIZE);
  });

  it("rejects a value that occurs too often", () => {
    expect(arrangeDeck([...values.slice(0, -1), 12])).toBeNull();
  });

  it("rejects a value that is no card", () => {
    expect(arrangeDeck([...values.slice(0, -1), 99])).toBeNull();
  });

  it("rejects too few and too many cards", () => {
    expect(arrangeDeck(values.slice(1))).toBeNull();
    expect(arrangeDeck([...values, 0])).toBeNull();
    expect(arrangeDeck([])).toBeNull();
  });
});
