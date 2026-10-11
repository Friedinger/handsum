import {
  STARTING_VIEW_CARD_COUNT,
  type Card,
  type CardAction,
  type Move,
  type PlayerId,
  type StartedGame,
} from "../engine";

export interface SlotRef {
  readonly playerId: PlayerId;
  readonly slotIndex: number;
}

export type ClickTarget =
  | { readonly kind: "slot"; readonly slot: SlotRef }
  | { readonly kind: "drawPile" }
  | { readonly kind: "discardPile" }
  | { readonly kind: "heldCard" };

export type Intent =
  | { readonly kind: "none" }
  | { readonly kind: "pickStartingCards"; readonly slotIndices: readonly number[] }
  | {
      readonly kind: "takingDiscard";
      readonly severalCards: boolean;
      readonly slotIndices: readonly number[];
    }
  | { readonly kind: "swappingSeveral"; readonly slotIndices: readonly number[] }
  | {
      readonly kind: "action";
      readonly action: CardAction;
      readonly ownSlotIndex: number | null;
      readonly target: SlotRef | null;
    };

export type Situation =
  | { readonly kind: "startingView" }
  | { readonly kind: "choosing" }
  | { readonly kind: "holding"; readonly card: Card }
  | { readonly kind: "waiting" };

export interface ClickOutcome {
  readonly intent: Intent;
  readonly move: Move | null;
}

export const noIntent: Intent = { kind: "none" };

export function situationOf(state: StartedGame, selfId: PlayerId): Situation {
  const { phase } = state;
  if (phase.kind === "startingView") {
    return phase.viewedPlayerIds.includes(selfId) ? { kind: "waiting" } : { kind: "startingView" };
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
    intent.kind === "swappingSeveral" || (intent.kind === "takingDiscard" && intent.severalCards)
  );
}

export function canToggleSeveral(situation: Situation, intent: Intent): boolean {
  if (situation.kind === "choosing") {
    return intent.kind === "takingDiscard";
  }
  return (
    situation.kind === "holding" && (intent.kind === "none" || intent.kind === "swappingSeveral")
  );
}

// Swapping several equal cards at once needs an explicit switch, so a single click on an own
// card can swap right away in the common case.
export function toggleSeveral(intent: Intent): Intent {
  switch (intent.kind) {
    case "takingDiscard":
      return { kind: "takingDiscard", severalCards: !intent.severalCards, slotIndices: [] };
    case "none":
      return { kind: "swappingSeveral", slotIndices: [] };
    case "swappingSeveral":
      return noIntent;
    case "pickStartingCards":
    case "action":
      return intent;
  }
}

function toggle(slotIndices: readonly number[], slotIndex: number): number[] {
  return slotIndices.includes(slotIndex)
    ? slotIndices.filter((selected) => selected !== slotIndex)
    : [...slotIndices, slotIndex];
}

function unchanged(intent: Intent): ClickOutcome {
  return { intent, move: null };
}

function play(move: Move): ClickOutcome {
  return { intent: noIntent, move };
}

function ownSlotIndex(target: ClickTarget, selfId: PlayerId): number | null {
  return target.kind === "slot" && target.slot.playerId === selfId ? target.slot.slotIndex : null;
}

function clickDuringStartingView(intent: Intent, target: ClickTarget, selfId: PlayerId) {
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex === null) {
    return unchanged(intent);
  }
  const slotIndices = toggle(selectedOwnSlots(intent), slotIndex);
  return slotIndices.length === STARTING_VIEW_CARD_COUNT
    ? play({ type: "viewStartingCards", playerId: selfId, slotIndices })
    : unchanged({ kind: "pickStartingCards", slotIndices });
}

function clickWhileTakingDiscard(
  intent: Intent & { kind: "takingDiscard" },
  target: ClickTarget,
  selfId: PlayerId,
): ClickOutcome {
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex !== null) {
    return intent.severalCards
      ? unchanged({ ...intent, slotIndices: toggle(intent.slotIndices, slotIndex) })
      : play({ type: "swapDiscardCard", playerId: selfId, slotIndices: [slotIndex] });
  }
  switch (target.kind) {
    case "heldCard":
      return intent.slotIndices.length > 0
        ? play({ type: "swapDiscardCard", playerId: selfId, slotIndices: intent.slotIndices })
        : unchanged(intent);
    case "discardPile":
      return unchanged(noIntent);
    case "slot":
    case "drawPile":
      return unchanged(intent);
  }
}

// A turn starts by picking a pile; the discard card is only taken for real once it is swapped.
function clickWhileChoosing(intent: Intent, target: ClickTarget, selfId: PlayerId) {
  if (intent.kind === "takingDiscard") {
    return clickWhileTakingDiscard(intent, target, selfId);
  }
  switch (target.kind) {
    case "drawPile":
      return play({ type: "drawFromDeck", playerId: selfId });
    case "discardPile":
      return unchanged({ kind: "takingDiscard", severalCards: false, slotIndices: [] });
    case "slot":
    case "heldCard":
      return unchanged(intent);
  }
}

function actionMove(intent: Intent & { kind: "action" }, selfId: PlayerId): Move | null {
  const { action, ownSlotIndex: ownSlot, target } = intent;
  switch (action) {
    case "viewOwn":
      return ownSlot === null
        ? null
        : { type: "viewOwnCard", playerId: selfId, slotIndex: ownSlot };
    case "viewOther":
      return target
        ? {
            type: "viewOtherCard",
            playerId: selfId,
            targetPlayerId: target.playerId,
            slotIndex: target.slotIndex,
          }
        : null;
    case "exchangeBlind":
      return ownSlot !== null && target
        ? {
            type: "exchangeBlind",
            playerId: selfId,
            ownSlotIndex: ownSlot,
            targetPlayerId: target.playerId,
            targetSlotIndex: target.slotIndex,
          }
        : null;
  }
}

function clickDuringAction(
  intent: Intent & { kind: "action" },
  target: ClickTarget,
  selfId: PlayerId,
): ClickOutcome {
  if (target.kind === "heldCard") {
    return unchanged(noIntent);
  }
  if (target.kind !== "slot") {
    return unchanged(intent);
  }
  const isOwn = target.slot.playerId === selfId;
  const acceptsOwn = intent.action !== "viewOther";
  const acceptsOther = intent.action !== "viewOwn";
  if ((isOwn && !acceptsOwn) || (!isOwn && !acceptsOther)) {
    return unchanged(intent);
  }
  const next: Intent = isOwn
    ? { ...intent, ownSlotIndex: target.slot.slotIndex }
    : { ...intent, target: target.slot };
  const move = actionMove(next, selfId);
  return move ? play(move) : unchanged(next);
}

function clickWhileSwappingSeveral(
  intent: Intent & { kind: "swappingSeveral" },
  target: ClickTarget,
  selfId: PlayerId,
): ClickOutcome {
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex !== null) {
    return unchanged({ ...intent, slotIndices: toggle(intent.slotIndices, slotIndex) });
  }
  switch (target.kind) {
    case "heldCard":
      return intent.slotIndices.length > 0
        ? play({ type: "swapDrawnCard", playerId: selfId, slotIndices: intent.slotIndices })
        : unchanged(intent);
    case "discardPile":
      return play({ type: "discardDrawnCard", playerId: selfId });
    case "slot":
    case "drawPile":
      return unchanged(intent);
  }
}

function clickWhileHolding(intent: Intent, target: ClickTarget, card: Card, selfId: PlayerId) {
  if (intent.kind === "action") {
    return clickDuringAction(intent, target, selfId);
  }
  if (intent.kind === "swappingSeveral") {
    return clickWhileSwappingSeveral(intent, target, selfId);
  }
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex !== null) {
    return play({ type: "swapDrawnCard", playerId: selfId, slotIndices: [slotIndex] });
  }
  switch (target.kind) {
    case "heldCard":
      return card.action
        ? unchanged({ kind: "action", action: card.action, ownSlotIndex: null, target: null })
        : unchanged(intent);
    case "discardPile":
      return play({ type: "discardDrawnCard", playerId: selfId });
    case "slot":
    case "drawPile":
      return unchanged(intent);
  }
}

export function handleClick(
  state: StartedGame,
  selfId: PlayerId,
  intent: Intent,
  target: ClickTarget,
): ClickOutcome {
  const situation = situationOf(state, selfId);
  switch (situation.kind) {
    case "startingView":
      return clickDuringStartingView(intent, target, selfId);
    case "choosing":
      return clickWhileChoosing(intent, target, selfId);
    case "holding":
      return clickWhileHolding(intent, target, situation.card, selfId);
    case "waiting":
      return unchanged(intent);
  }
}

export function isClickable(
  state: StartedGame,
  selfId: PlayerId,
  intent: Intent,
  target: ClickTarget,
): boolean {
  const outcome = handleClick(state, selfId, intent, target);
  return outcome.move !== null || outcome.intent !== intent;
}

export function isSlotMarked(intent: Intent, slot: SlotRef, selfId: PlayerId): boolean {
  if (intent.kind === "action") {
    return slot.playerId === selfId
      ? intent.ownSlotIndex === slot.slotIndex
      : intent.target?.playerId === slot.playerId && intent.target.slotIndex === slot.slotIndex;
  }
  return slot.playerId === selfId && selectedOwnSlots(intent).includes(slot.slotIndex);
}
