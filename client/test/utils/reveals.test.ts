import { describe, expect, it } from "vitest";
import type { Move } from "@/engine";
import {
  applyToStarted,
  holding,
  makeCard,
  playingGame,
  startedGame,
  withLayouts,
} from "@test/support/gameFixtures";
import {
  isRevealed,
  revealsAfterMove,
  STARTING_VIEW_REVEAL_MS,
  VIEW_REVEAL_MS,
} from "@/utils/reveals";

describe("revealsAfterMove", () => {
  it("shows the own starting cards to the viewing player only", () => {
    const move: Move = {
      type: "viewStartingCards",
      playerId: "player-1",
      slotIndices: [1, 3],
    };
    const state = applyToStarted(startedGame(2), move);
    const reveals = revealsAfterMove(state, move, "player-1");
    expect(
      reveals.map((reveal) => [reveal.slotIndex, reveal.durationMs]),
    ).toEqual([
      [1, STARTING_VIEW_REVEAL_MS],
      [3, STARTING_VIEW_REVEAL_MS],
    ]);
    expect(revealsAfterMove(state, move, "player-2")).toEqual([]);
  });

  it("shows a viewed card of another player to the viewer only", () => {
    const move: Move = {
      type: "viewOtherCard",
      playerId: "player-1",
      targetPlayerId: "player-2",
      slotIndex: 0,
    };
    const state = applyToStarted(
      holding(playingGame(3), makeCard(9, "viewOther")),
      move,
    );
    const [reveal] = revealsAfterMove(state, move, "player-1");
    expect(reveal).toMatchObject({
      ownerId: "player-2",
      slotIndex: 0,
      durationMs: VIEW_REVEAL_MS,
    });
    expect(revealsAfterMove(state, move, "player-3")).toEqual([]);
    expect(revealsAfterMove(state, move, "player-2")).toEqual([]);
  });

  it("shows the cards of a failed multi-swap to everyone", () => {
    const layout = [
      makeCard(4, null, 1),
      makeCard(6, null, 2),
      makeCard(1, null, 3),
      makeCard(2, null, 4),
    ];
    const move: Move = {
      type: "swapDiscardCard",
      playerId: "player-1",
      slotIndices: [0, 1],
    };
    const state = applyToStarted(withLayouts(playingGame(2), [layout]), move);
    const reveals = revealsAfterMove(state, move, "player-2");
    expect(reveals.map((reveal) => reveal.slotIndex)).toEqual([0, 1]);
    expect(isRevealed(reveals, state, "player-1", 0)).toBe(true);
    expect(isRevealed(reveals, state, "player-1", 2)).toBe(false);
  });
});

describe("isRevealed", () => {
  it("ends once the revealed card has left its slot", () => {
    const move: Move = {
      type: "viewStartingCards",
      playerId: "player-1",
      slotIndices: [0, 1],
    };
    const state = applyToStarted(startedGame(2), move);
    const reveals = revealsAfterMove(state, move, "player-1");
    const swapped = withLayouts(state, [[makeCard(13), null, null, null]]);
    expect(isRevealed(reveals, state, "player-1", 0)).toBe(true);
    expect(isRevealed(reveals, swapped, "player-1", 0)).toBe(false);
  });
});
