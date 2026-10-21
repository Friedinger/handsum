import type { Card, CardAction, PlayerId, StartedGame } from "@/engine";

export interface SlotRef {
  readonly playerId: PlayerId;
  readonly slotIndex: number;
}

export type ClickTarget =
  | { readonly kind: "slot"; readonly slot: SlotRef }
  | { readonly kind: "drawPile" }
  | { readonly kind: "discardPile" }
  | { readonly kind: "heldCard" };

export interface NoIntent {
  readonly kind: "none";
}

export interface PickStartingCardsIntent {
  readonly kind: "pickStartingCards";
  readonly slotIndices: readonly number[];
}

export interface TakingDiscardIntent {
  readonly kind: "takingDiscard";
  readonly slotIndices: readonly number[];
}

export interface SelectingSwapCardsIntent {
  readonly kind: "selectingSwapCards";
  readonly slotIndices: readonly number[];
}

export interface ActionIntent {
  readonly kind: "action";
  readonly action: CardAction;
  readonly ownSlotIndex: number | null;
  readonly target: SlotRef | null;
}

export type Intent =
  | NoIntent
  | PickStartingCardsIntent
  | TakingDiscardIntent
  | SelectingSwapCardsIntent
  | ActionIntent;

export type Situation =
  | { readonly kind: "startingView" }
  | { readonly kind: "choosing" }
  | { readonly kind: "holding"; readonly card: Card }
  | { readonly kind: "waiting" };

export const noIntent: Intent = { kind: "none" };

export function situationOf(state: StartedGame, selfId: PlayerId): Situation {
  const { phase } = state;
  if (phase.kind === "startingView") {
    return phase.viewedPlayerIds.includes(selfId)
      ? { kind: "waiting" }
      : { kind: "startingView" };
  }
  if (phase.kind !== "playing" || phase.currentPlayerId !== selfId) {
    return { kind: "waiting" };
  }
  return phase.step.kind === "holdingDrawnCard"
    ? { kind: "holding", card: phase.step.card }
    : { kind: "choosing" };
}

export function selectedOwnSlots(intent: Intent): readonly number[] {
  switch (intent.kind) {
    case "pickStartingCards":
    case "takingDiscard":
    case "selectingSwapCards":
      return intent.slotIndices;
    case "none":
    case "action":
      return [];
  }
}

export function isSlotMarked(
  intent: Intent,
  slot: SlotRef,
  selfId: PlayerId,
): boolean {
  if (intent.kind === "action") {
    return slot.playerId === selfId
      ? intent.ownSlotIndex === slot.slotIndex
      : intent.target?.playerId === slot.playerId &&
          intent.target.slotIndex === slot.slotIndex;
  }
  return (
    slot.playerId === selfId &&
    selectedOwnSlots(intent).includes(slot.slotIndex)
  );
}
