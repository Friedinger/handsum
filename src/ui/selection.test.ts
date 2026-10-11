import { describe, expect, it } from "vitest";
import { startedGame } from "../engine/testFixtures";
import {
  beginSelection,
  idle,
  initialSelection,
  isSelectable,
  isSelected,
  moveForSelection,
  selectSlot,
  submitsOnSelect,
  type Selection,
  type SlotRef,
} from "./selection";

const self = "player-1";
const own = (slotIndex: number): SlotRef => ({ playerId: self, slotIndex });
const other = (slotIndex: number): SlotRef => ({ playerId: "player-2", slotIndex });

function selectAll(selection: Selection, slots: SlotRef[]): Selection {
  return slots.reduce((current, slot) => selectSlot(current, slot, self), selection);
}

describe("selection", () => {
  it("starts with picking starting cards until the player has viewed them", () => {
    expect(initialSelection(startedGame(2), self)).toEqual({
      kind: "startingView",
      slotIndices: [],
    });
  });

  it("allows at most two starting cards and toggles them", () => {
    const selection = selectAll(initialSelection(startedGame(2), self), [own(0), own(2)]);
    expect(isSelectable(selection, own(3), self)).toBe(false);
    expect(isSelectable(selection, other(0), self)).toBe(false);
    expect(moveForSelection(selectSlot(selection, own(0), self), self)).toEqual({
      type: "viewStartingCards",
      playerId: self,
      slotIndices: [2],
    });
  });

  it("collects several own slots for a swap", () => {
    const selection = selectAll(beginSelection("swapDrawnCard"), [own(1), own(3), other(0)]);
    expect(isSelected(selection, own(3), self)).toBe(true);
    expect(moveForSelection(selection, self)).toEqual({
      type: "swapDrawnCard",
      playerId: self,
      slotIndices: [1, 3],
    });
  });

  it("submits a view as soon as a card is picked", () => {
    const viewOther = beginSelection("viewOtherCard");
    expect(isSelectable(viewOther, own(0), self)).toBe(false);
    const picked = selectSlot(viewOther, other(2), self);
    expect(submitsOnSelect(picked)).toBe(true);
    expect(moveForSelection(picked, self)).toEqual({
      type: "viewOtherCard",
      playerId: self,
      targetPlayerId: "player-2",
      slotIndex: 2,
    });
    expect(moveForSelection(viewOther, self)).toBeNull();
  });

  it("needs one own and one other card for a blind exchange", () => {
    const halfway = selectSlot(beginSelection("exchangeBlind"), other(1), self);
    expect(moveForSelection(halfway, self)).toBeNull();
    expect(moveForSelection(selectSlot(halfway, own(3), self), self)).toEqual({
      type: "exchangeBlind",
      playerId: self,
      ownSlotIndex: 3,
      targetPlayerId: "player-2",
      targetSlotIndex: 1,
    });
  });

  it("ignores clicks while idle", () => {
    expect(selectSlot(idle, own(0), self)).toBe(idle);
    expect(moveForSelection(idle, self)).toBeNull();
  });
});
