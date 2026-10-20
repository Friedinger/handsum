import { describe, expect, it } from "vitest";
import { startedGame } from "@test/support/gameFixtures";
import { displayName } from "@/utils/displayName";

describe("displayName", () => {
  const state = startedGame(2);

  it("returns the name of a seated player", () => {
    expect(displayName(state, "player-2")).toBe("Player 2");
  });

  it("falls back to the ID of an unknown player", () => {
    expect(displayName(state, "stranger")).toBe("stranger");
  });
});
