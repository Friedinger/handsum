import { describe, expect, it } from "vitest";

import { valueTier } from "@/utils/slotView";

import { makeCard } from "@test/support/gameFixtures";

describe("valueTier", () => {
  it.each([
    [0, "low"],
    [3, "low"],
    [4, "middle"],
    [6, "middle"],
    [7, "plain-high"],
    [13, "plain-high"],
  ])("puts a plain %i into the %s tier", (value, tier) => {
    expect(valueTier(makeCard(value))).toBe(tier);
  });

  it("gives action cards their own tier whatever their value", () => {
    expect(valueTier(makeCard(1, "viewOwn"))).toBe("action");
    expect(valueTier(makeCard(12, "exchangeBlind"))).toBe("action");
  });
});
