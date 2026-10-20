import { describe, expect, it } from "vitest";

import { displayName } from "@/utils/displayName";

import { startedGame } from "@test/support/gameFixtures";

describe("displayName", () => {
  const state = startedGame(2);

  it("returns the name of a seated player", () => {
    expect(displayName(state, "player-2")).toBe("Player 2");
  });

  it("falls back to the ID of an unknown player", () => {
    expect(displayName(state, "stranger")).toBe("stranger");
  });
});
