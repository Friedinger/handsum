import { afterEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { useTableIntent } from "@/composables/useTableIntent";
import type { Move, StartedGame } from "@/engine";

import {
  applyToStarted,
  holding,
  makeCard,
  playingGame,
  startedGame,
} from "@test/support/gameFixtures";
import { mountComposable } from "@test/support/mountComposable";

const SELF_ID = "player-1";

function setup(initial: StartedGame) {
  const state = ref(initial);
  const moves: Move[] = [];
  const mounted = mountComposable(() =>
    useTableIntent({
      state: () => state.value,
      selfId: () => SELF_ID,
      onMove: (move) => moves.push(move),
    }),
  );
  return { state, moves, ...mounted };
}

function selectOwnSlotWhileHolding() {
  const table = setup(holding(playingGame(), makeCard(5)));
  table.result.click({
    kind: "slot",
    slot: { playerId: SELF_ID, slotIndex: 0 },
  });
  return table;
}

describe("useTableIntent", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("emits the move a click leads to", () => {
    const { result, moves } = setup(playingGame());

    result.click({ kind: "drawPile" });

    expect(moves).toEqual([{ type: "drawFromDeck", playerId: SELF_ID }]);
  });

  it("remembers a half-made selection", () => {
    const { result, moves } = selectOwnSlotWhileHolding();

    expect(result.hasSelection.value).toBe(true);
    expect(moves).toEqual([]);
  });

  it("cancels the selection on Escape", () => {
    const { result } = selectOwnSlotWhileHolding();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(result.hasSelection.value).toBe(false);
  });

  it("cancels the selection on a click beside the buttons, but not on one", () => {
    const { result } = selectOwnSlotWhileHolding();
    const button = document.createElement("button");
    document.body.append(button);

    result.cancelOnEmptyClick({ target: button } as unknown as MouseEvent);
    expect(result.hasSelection.value).toBe(true);

    result.cancelOnEmptyClick({
      target: document.body,
    } as unknown as MouseEvent);
    expect(result.hasSelection.value).toBe(false);
  });

  it("drops the selection when the own situation changes", async () => {
    const { result, state } = selectOwnSlotWhileHolding();

    state.value = playingGame();
    await nextTick();

    expect(result.hasSelection.value).toBe(false);
  });

  it("keeps the selection when another player moves", async () => {
    const { result, state } = setup(startedGame());
    result.click({
      kind: "slot",
      slot: { playerId: SELF_ID, slotIndex: 0 },
    });

    state.value = applyToStarted(state.value, {
      type: "viewStartingCards",
      playerId: "player-2",
      slotIndices: [0, 1],
    });
    await nextTick();

    expect(result.hasSelection.value).toBe(true);
  });

  it("stops listening for Escape once unmounted", () => {
    const { result, unmount } = selectOwnSlotWhileHolding();
    unmount();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(result.hasSelection.value).toBe(true);
  });
});
