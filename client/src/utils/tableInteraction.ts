import {
  type Card,
  type Move,
  type PlayerId,
  type StartedGame,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";
import {
  type ActionIntent,
  type ClickTarget,
  type Intent,
  noIntent,
  selectedOwnSlots,
  situationOf,
  type TakingDiscardIntent,
} from "@/utils/tableIntent";

export interface ClickOutcome {
  readonly intent: Intent;
  readonly move: Move | null;
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
  return target.kind === "slot" && target.slot.playerId === selfId
    ? target.slot.slotIndex
    : null;
}

function clickDuringStartingView(
  intent: Intent,
  target: ClickTarget,
  selfId: PlayerId,
): ClickOutcome {
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex === null) {
    return unchanged(intent);
  }
  const slotIndices = toggle(selectedOwnSlots(intent), slotIndex);
  return slotIndices.length === STARTING_VIEW_CARD_COUNT
    ? play({ type: "viewStartingCards", playerId: selfId, slotIndices })
    : unchanged({ kind: "pickStartingCards", slotIndices });
}

function swapSelection(
  type: "swapDrawnCard" | "swapDiscardCard",
  intent: Intent,
  selfId: PlayerId,
): ClickOutcome {
  const slotIndices = selectedOwnSlots(intent);
  return slotIndices.length > 0
    ? play({ type, playerId: selfId, slotIndices })
    : unchanged(intent);
}

function clickWhileTakingDiscard(
  intent: TakingDiscardIntent,
  target: ClickTarget,
  selfId: PlayerId,
): ClickOutcome {
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex !== null) {
    return unchanged({
      ...intent,
      slotIndices: toggle(intent.slotIndices, slotIndex),
    });
  }
  switch (target.kind) {
    case "heldCard":
      return swapSelection("swapDiscardCard", intent, selfId);
    case "discardPile":
      return unchanged(noIntent);
    case "slot":
    case "drawPile":
      return unchanged(intent);
  }
}

/**
 * A turn starts by picking a pile; the discard card is only taken for real once it is swapped.
 */
function clickWhileChoosing(
  intent: Intent,
  target: ClickTarget,
  selfId: PlayerId,
): ClickOutcome {
  if (intent.kind === "takingDiscard") {
    return clickWhileTakingDiscard(intent, target, selfId);
  }
  switch (target.kind) {
    case "drawPile":
      return play({ type: "drawFromDeck", playerId: selfId });
    case "discardPile":
      return unchanged({ kind: "takingDiscard", slotIndices: [] });
    case "slot":
    case "heldCard":
      return unchanged(intent);
  }
}

function actionMove(intent: ActionIntent, selfId: PlayerId): Move | null {
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
  intent: ActionIntent,
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

function holdAction(card: Card, intent: Intent): ClickOutcome {
  return card.action
    ? unchanged({
        kind: "action",
        action: card.action,
        ownSlotIndex: null,
        target: null,
      })
    : unchanged(intent);
}

function clickWhileHolding(
  intent: Intent,
  target: ClickTarget,
  card: Card,
  selfId: PlayerId,
): ClickOutcome {
  if (intent.kind === "action") {
    return clickDuringAction(intent, target, selfId);
  }
  const slotIndex = ownSlotIndex(target, selfId);
  if (slotIndex !== null) {
    return unchanged({
      kind: "selectingSwapCards",
      slotIndices: toggle(selectedOwnSlots(intent), slotIndex),
    });
  }
  switch (target.kind) {
    case "heldCard":
      return holdAction(card, intent);
    case "discardPile":
      return selectedOwnSlots(intent).length > 0
        ? swapSelection("swapDrawnCard", intent, selfId)
        : play({ type: "discardDrawnCard", playerId: selfId });
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
