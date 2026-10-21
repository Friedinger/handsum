import { describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import { recentMoveDescriptions } from "@/utils/moveDescription";

import { playingGame } from "@test/support/gameFixtures";

const state = playingGame(2);

describe("recentMoveDescriptions", () => {
  it("names the player and counts swapped cards", () => {
    expect(
      recentMoveDescriptions(state, [
        { type: "swapDrawnCard", playerId: "player-1", slotIndices: [0, 2] },
        { type: "swapDiscardCard", playerId: "player-2", slotIndices: [1] },
      ]),
    ).toEqual([
      strings.moveLog.swappedDrawnCard("Player 1", 2),
      strings.moveLog.swappedDiscardCard("Player 2", 1),
    ]);
  });

  it("skips moves that are not worth reporting", () => {
    expect(
      recentMoveDescriptions(state, [
        {
          type: "viewStartingCards",
          playerId: "player-1",
          slotIndices: [0, 1],
        },
      ]),
    ).toEqual([]);
  });

  it("keeps only the latest entries", () => {
    const draws = Array.from({ length: 5 }, () => ({
      type: "callEnd" as const,
      playerId: "player-1",
    }));
    expect(recentMoveDescriptions(state, draws)).toHaveLength(3);
  });
});
