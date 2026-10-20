import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useReveals } from "@/composables/useReveals";
import { STARTING_VIEW_REVEAL_MS } from "@/utils/reveals";

import { startGameMove } from "@test/support/gameFixtures";
import { logOf } from "@test/support/logFixtures";
import { mountComposable } from "@test/support/mountComposable";

const SELF = "player-1";

describe("useReveals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const log = ref(logOf([startGameMove()]));
    const mounted = mountComposable(() => useReveals(() => log.value, SELF));
    const viewOwnStartingCards = async (playerId: string) => {
      log.value = logOf([
        ...log.value.moves,
        { type: "viewStartingCards", playerId, slotIndices: [0, 1] },
      ]);
      await vi.advanceTimersByTimeAsync(0);
    };
    return { ...mounted, viewOwnStartingCards };
  }

  it("shows nothing at the start", () => {
    expect(setup().result.value).toEqual([]);
  });

  it("reveals the starting cards the player looked at", async () => {
    const { result, viewOwnStartingCards } = setup();

    await viewOwnStartingCards(SELF);

    expect(result.value.map((reveal) => reveal.slotIndex)).toEqual([0, 1]);
    expect(result.value.every((reveal) => reveal.ownerId === SELF)).toBe(true);
  });

  it("does not reveal what other players looked at", async () => {
    const { result, viewOwnStartingCards } = setup();

    await viewOwnStartingCards("player-2");

    expect(result.value).toEqual([]);
  });

  it("hides the cards again after their time is up", async () => {
    const { result, viewOwnStartingCards } = setup();
    await viewOwnStartingCards(SELF);

    await vi.advanceTimersByTimeAsync(STARTING_VIEW_REVEAL_MS);

    expect(result.value).toEqual([]);
  });

  it("stops its timers when unmounted", async () => {
    const { viewOwnStartingCards, unmount } = setup();
    await viewOwnStartingCards(SELF);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
