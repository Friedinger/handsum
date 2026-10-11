import { STARTING_VIEW_CARD_COUNT, type Move, type PlayerId, type StartedGame } from "../engine";

export interface SlotRef {
  readonly playerId: PlayerId;
  readonly slotIndex: number;
}

export type Selection =
  | { readonly kind: "idle" }
  | { readonly kind: "startingView"; readonly slotIndices: readonly number[] }
  | { readonly kind: "swapDiscardCard"; readonly slotIndices: readonly number[] }
  | { readonly kind: "swapDrawnCard"; readonly slotIndices: readonly number[] }
  | { readonly kind: "viewOwnCard" | "viewOtherCard"; readonly target: SlotRef | null }
  | {
      readonly kind: "exchangeBlind";
      readonly ownSlotIndex: number | null;
      readonly target: SlotRef | null;
    };

export type SelectionKind = Selection["kind"];

export const idle: Selection = { kind: "idle" };

export function initialSelection(state: StartedGame, selfId: PlayerId): Selection {
  const { phase } = state;
  return phase.kind === "startingView" && !phase.viewedPlayerIds.includes(selfId)
    ? { kind: "startingView", slotIndices: [] }
    : idle;
}

export function beginSelection(kind: Exclude<SelectionKind, "idle" | "startingView">): Selection {
  switch (kind) {
    case "swapDiscardCard":
    case "swapDrawnCard":
      return { kind, slotIndices: [] };
    case "viewOwnCard":
    case "viewOtherCard":
      return { kind, target: null };
    case "exchangeBlind":
      return { kind, ownSlotIndex: null, target: null };
  }
}

function toggle(slotIndices: readonly number[], slotIndex: number): number[] {
  return slotIndices.includes(slotIndex)
    ? slotIndices.filter((selected) => selected !== slotIndex)
    : [...slotIndices, slotIndex];
}

export function isSelectable(selection: Selection, slot: SlotRef, selfId: PlayerId): boolean {
  const isOwn = slot.playerId === selfId;
  switch (selection.kind) {
    case "idle":
      return false;
    case "startingView":
      return (
        isOwn &&
        (selection.slotIndices.includes(slot.slotIndex) ||
          selection.slotIndices.length < STARTING_VIEW_CARD_COUNT)
      );
    case "swapDiscardCard":
    case "swapDrawnCard":
    case "viewOwnCard":
      return isOwn;
    case "viewOtherCard":
    case "exchangeBlind":
      return selection.kind === "exchangeBlind" || !isOwn;
  }
}

export function isSelected(selection: Selection, slot: SlotRef, selfId: PlayerId): boolean {
  switch (selection.kind) {
    case "startingView":
    case "swapDiscardCard":
    case "swapDrawnCard":
      return slot.playerId === selfId && selection.slotIndices.includes(slot.slotIndex);
    case "exchangeBlind":
      return slot.playerId === selfId
        ? selection.ownSlotIndex === slot.slotIndex
        : selection.target?.playerId === slot.playerId &&
            selection.target.slotIndex === slot.slotIndex;
    case "idle":
      return false;
    case "viewOwnCard":
    case "viewOtherCard":
      return (
        selection.target?.playerId === slot.playerId &&
        selection.target.slotIndex === slot.slotIndex
      );
  }
}

export function selectSlot(selection: Selection, slot: SlotRef, selfId: PlayerId): Selection {
  if (!isSelectable(selection, slot, selfId)) {
    return selection;
  }
  switch (selection.kind) {
    case "startingView":
    case "swapDiscardCard":
    case "swapDrawnCard":
      return { ...selection, slotIndices: toggle(selection.slotIndices, slot.slotIndex) };
    case "exchangeBlind":
      return slot.playerId === selfId
        ? { ...selection, ownSlotIndex: slot.slotIndex }
        : { ...selection, target: slot };
    case "viewOwnCard":
    case "viewOtherCard":
      return { ...selection, target: slot };
    case "idle":
      return selection;
  }
}

// Picking a single card is the whole decision for these, so they need no confirm step.
export function submitsOnSelect(selection: Selection): boolean {
  return (
    selection.kind === "viewOwnCard" ||
    selection.kind === "viewOtherCard" ||
    selection.kind === "exchangeBlind"
  );
}

export function moveForSelection(selection: Selection, selfId: PlayerId): Move | null {
  const playerId = selfId;
  switch (selection.kind) {
    case "idle":
      return null;
    case "startingView":
      return { type: "viewStartingCards", playerId, slotIndices: selection.slotIndices };
    case "swapDiscardCard":
    case "swapDrawnCard":
      return { type: selection.kind, playerId, slotIndices: selection.slotIndices };
    case "viewOwnCard":
      return selection.target
        ? { type: "viewOwnCard", playerId, slotIndex: selection.target.slotIndex }
        : null;
    case "viewOtherCard":
      return selection.target
        ? {
            type: "viewOtherCard",
            playerId,
            targetPlayerId: selection.target.playerId,
            slotIndex: selection.target.slotIndex,
          }
        : null;
    case "exchangeBlind":
      return selection.ownSlotIndex !== null && selection.target
        ? {
            type: "exchangeBlind",
            playerId,
            ownSlotIndex: selection.ownSlotIndex,
            targetPlayerId: selection.target.playerId,
            targetSlotIndex: selection.target.slotIndex,
          }
        : null;
  }
}
