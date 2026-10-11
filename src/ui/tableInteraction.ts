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
  | { readonly kind: "pickOwn"; readonly slotIndices: readonly number[] }
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
  return intent.kind === "pickOwn" ? intent.slotIndices : [];
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

function toggleOwn(intent: Intent, slotIndex: number): ClickOutcome {
  const slotIndices = toggle(selectedOwnSlots(intent), slotIndex);
  return unchanged(slotIndices.length > 0 ? { kind: "pickOwn", slotIndices } : noIntent);
}

function clickDuringStartingView(intent: Intent, target: ClickTarget, selfId: PlayerId) {
  if (target.kind !== "slot" || target.slot.playerId !== selfId) {
    return unchanged(intent);
  }
  const slotIndices = toggle(selectedOwnSlots(intent), target.slot.slotIndex);
  return slotIndices.length === STARTING_VIEW_CARD_COUNT
    ? play({ type: "viewStartingCards", playerId: selfId, slotIndices })
    : unchanged({ kind: "pickOwn", slotIndices });
}

function clickWhileChoosing(intent: Intent, target: ClickTarget, selfId: PlayerId) {
  const selected = selectedOwnSlots(intent);
  switch (target.kind) {
    case "slot":
      return target.slot.playerId === selfId
        ? toggleOwn(intent, target.slot.slotIndex)
        : unchanged(intent);
    case "drawPile":
      return play({ type: "drawFromDeck", playerId: selfId });
    case "discardPile":
      return selected.length > 0
        ? play({ type: "swapDiscardCard", playerId: selfId, slotIndices: selected })
        : unchanged(intent);
    case "heldCard":
      return unchanged(intent);
  }
}

function actionMove(intent: Intent & { kind: "action" }, selfId: PlayerId): Move | null {
  const { action, ownSlotIndex, target } = intent;
  switch (action) {
    case "viewOwn":
      return ownSlotIndex === null
        ? null
        : { type: "viewOwnCard", playerId: selfId, slotIndex: ownSlotIndex };
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
      return ownSlotIndex !== null && target
        ? {
            type: "exchangeBlind",
            playerId: selfId,
            ownSlotIndex,
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

function clickWhileHolding(intent: Intent, target: ClickTarget, card: Card, selfId: PlayerId) {
  if (intent.kind === "action") {
    return clickDuringAction(intent, target, selfId);
  }
  const selected = selectedOwnSlots(intent);
  switch (target.kind) {
    case "slot":
      return target.slot.playerId === selfId
        ? toggleOwn(intent, target.slot.slotIndex)
        : unchanged(intent);
    case "heldCard":
      if (selected.length > 0) {
        return play({ type: "swapDrawnCard", playerId: selfId, slotIndices: selected });
      }
      return card.action
        ? unchanged({ kind: "action", action: card.action, ownSlotIndex: null, target: null })
        : unchanged(intent);
    case "discardPile":
      return play({ type: "discardDrawnCard", playerId: selfId });
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
  if (intent.kind === "pickOwn") {
    return slot.playerId === selfId && intent.slotIndices.includes(slot.slotIndex);
  }
  if (intent.kind === "action") {
    return slot.playerId === selfId
      ? intent.ownSlotIndex === slot.slotIndex
      : intent.target?.playerId === slot.playerId && intent.target.slotIndex === slot.slotIndex;
  }
  return false;
}
