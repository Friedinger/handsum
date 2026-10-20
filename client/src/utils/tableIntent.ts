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
  readonly severalCards: boolean;
  readonly slotIndices: readonly number[];
}

export interface SwappingSeveralIntent {
  readonly kind: "swappingSeveral";
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
  | SwappingSeveralIntent
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
    case "swappingSeveral":
      return intent.slotIndices;
    case "none":
    case "action":
      return [];
  }
}

export function isSwappingSeveral(intent: Intent): boolean {
  return (
    intent.kind === "swappingSeveral" ||
    (intent.kind === "takingDiscard" && intent.severalCards)
  );
}

export function canToggleSeveral(
  situation: Situation,
  intent: Intent,
): boolean {
  if (situation.kind === "choosing") {
    return intent.kind === "takingDiscard";
  }
  return (
    situation.kind === "holding" &&
    (intent.kind === "none" || intent.kind === "swappingSeveral")
  );
}

/**
 * Swapping several equal cards at once needs an explicit switch, so a single click on an own
 * card can swap right away in the common case.
 */
export function toggleSeveral(intent: Intent): Intent {
  switch (intent.kind) {
    case "takingDiscard":
      return {
        kind: "takingDiscard",
        severalCards: !intent.severalCards,
        slotIndices: [],
      };
    case "none":
      return { kind: "swappingSeveral", slotIndices: [] };
    case "swappingSeveral":
      return noIntent;
    case "pickStartingCards":
    case "action":
      return intent;
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
