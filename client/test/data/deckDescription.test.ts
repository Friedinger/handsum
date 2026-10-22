import { describe, expect, it } from "vitest";

import {
  describeDeck,
  describeValues,
  valuesWithPower,
} from "@/data/deckDescription";
import { deckWording } from "@/data/strings/deckOverview";

describe("describeValues", () => {
  it("names single values, pairs and ranges", () => {
    expect(describeValues([4], deckWording)).toBe("4");
    expect(describeValues([0, 13], deckWording)).toBe("0 and 13");
    expect(describeValues([1, 2, 3, 4], deckWording)).toBe("1 to 4");
    expect(describeValues([3, 0, 1, 7], deckWording)).toBe("0 and 1, 3 and 7");
  });
});

describe("describeDeck", () => {
  it("groups values with the same count", () => {
    expect(
      describeDeck(
        [
          { value: 0, count: 2, points: 0, action: null },
          { value: 1, count: 4, points: 1, action: null },
          { value: 2, count: 4, points: 2, action: null },
          { value: 3, count: 2, points: 3, action: null },
        ],
        deckWording,
      ),
    ).toEqual({
      total: "12 cards in total.",
      facts: [
        { values: "1 and 2", detail: "4 each" },
        { values: "0 and 3", detail: "2 each" },
      ],
    });
  });
});

describe("valuesWithPower", () => {
  it("lists the values whose cards have an action", () => {
    expect(
      valuesWithPower(
        [
          { value: 1, count: 4, points: 1, action: null },
          { value: 2, count: 4, points: 2, action: "viewOwn" },
          { value: 3, count: 4, points: 3, action: "viewOther" },
        ],
        deckWording,
      ),
    ).toBe("2 and 3");
  });
});
