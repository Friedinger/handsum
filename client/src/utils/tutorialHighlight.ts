import type { PlayerId, StartedGame } from "@/engine";
import { type Highlight, noHighlight } from "@/utils/tableHighlight";
import {
  type ActionIntent,
  type ClickTarget,
  type Intent,
  selectedOwnSlots,
  situationOf,
  type SlotRef,
} from "@/utils/tableIntent";
import type { Lesson } from "@/utils/tutorialScript";

type ExpectedMove = Lesson["move"];

const DRAW_PILE: ClickTarget = { kind: "drawPile" };
const DISCARD_PILE: ClickTarget = { kind: "discardPile" };
const HELD_CARD: ClickTarget = { kind: "heldCard" };

function pointAt(...targets: readonly ClickTarget[]): Highlight {
  return { targets, callEnd: false };
}

function slotTarget(slot: SlotRef): ClickTarget {
  return { kind: "slot", slot };
}

function ownSlotTargets(
  selfId: PlayerId,
  slotIndices: readonly number[],
): ClickTarget[] {
  return slotIndices.map((slotIndex) =>
    slotTarget({ playerId: selfId, slotIndex }),
  );
}

/**
 * Wrong cards come first: the confirming click would submit them, so they have to be deselected
 * before anything else is marked.
 */
function selectionHighlight(
  expectedSlots: readonly number[],
  intent: Intent,
  selfId: PlayerId,
  confirmingTarget: ClickTarget | null,
): Highlight {
  const selected = selectedOwnSlots(intent);
  const wrong = selected.filter(
    (slotIndex) => !expectedSlots.includes(slotIndex),
  );
  const missing = expectedSlots.filter(
    (slotIndex) => !selected.includes(slotIndex),
  );
  if (wrong.length > 0) {
    return pointAt(...ownSlotTargets(selfId, wrong));
  }
  if (missing.length > 0) {
    return pointAt(...ownSlotTargets(selfId, missing));
  }
  return confirmingTarget ? pointAt(confirmingTarget) : noHighlight;
}

/**
 * The click that takes back whatever the player started and the lesson does not want.
 */
function undoHighlight(intent: Intent, selfId: PlayerId): Highlight {
  switch (intent.kind) {
    case "none":
      return noHighlight;
    case "action":
      return pointAt(HELD_CARD);
    case "takingDiscard":
      return intent.slotIndices.length > 0
        ? pointAt(...ownSlotTargets(selfId, intent.slotIndices))
        : pointAt(DISCARD_PILE);
    case "pickStartingCards":
    case "selectingSwapCards":
      return pointAt(...ownSlotTargets(selfId, intent.slotIndices));
  }
}

function opponentSlotTarget(
  playerId: PlayerId,
  slotIndex: number,
): ClickTarget {
  return slotTarget({ playerId, slotIndex });
}

/**
 * The move is submitted by the second click, so a chosen own card is always the first one.
 */
function exchangeBlindHighlight(
  expected: Extract<ExpectedMove, { type: "exchangeBlind" }>,
  intent: ActionIntent,
  selfId: PlayerId,
): Highlight {
  return intent.ownSlotIndex === expected.ownSlotIndex
    ? pointAt(
        opponentSlotTarget(expected.targetPlayerId, expected.targetSlotIndex),
      )
    : pointAt(...ownSlotTargets(selfId, [expected.ownSlotIndex]));
}

function actionTargetHighlight(
  expected: ExpectedMove,
  intent: ActionIntent,
  selfId: PlayerId,
): Highlight {
  switch (expected.type) {
    case "viewOwnCard":
      return pointAt(...ownSlotTargets(selfId, [expected.slotIndex]));
    case "viewOtherCard":
      return pointAt(
        opponentSlotTarget(expected.targetPlayerId, expected.slotIndex),
      );
    case "exchangeBlind":
      return exchangeBlindHighlight(expected, intent, selfId);
    case "viewStartingCards":
    case "drawFromDeck":
    case "swapDrawnCard":
    case "swapDiscardCard":
    case "discardDrawnCard":
    case "callEnd":
      return noHighlight;
  }
}

function startingViewHighlight(
  expected: ExpectedMove,
  intent: Intent,
  selfId: PlayerId,
): Highlight {
  return expected.type === "viewStartingCards"
    ? selectionHighlight(expected.slotIndices, intent, selfId, null)
    : noHighlight;
}

function choosingHighlight(
  expected: ExpectedMove,
  intent: Intent,
  selfId: PlayerId,
): Highlight {
  switch (expected.type) {
    case "drawFromDeck":
      return intent.kind === "none"
        ? pointAt(DRAW_PILE)
        : undoHighlight(intent, selfId);
    case "callEnd":
      return intent.kind === "none"
        ? { targets: [], callEnd: true }
        : undoHighlight(intent, selfId);
    case "swapDiscardCard":
      if (intent.kind === "none") {
        return pointAt(DISCARD_PILE);
      }
      return intent.kind === "takingDiscard"
        ? selectionHighlight(expected.slotIndices, intent, selfId, DISCARD_PILE)
        : undoHighlight(intent, selfId);
    case "viewStartingCards":
    case "swapDrawnCard":
    case "viewOwnCard":
    case "viewOtherCard":
    case "exchangeBlind":
    case "discardDrawnCard":
      return noHighlight;
  }
}

function holdingHighlight(
  expected: ExpectedMove,
  intent: Intent,
  selfId: PlayerId,
): Highlight {
  switch (expected.type) {
    case "swapDrawnCard":
      return intent.kind === "none" || intent.kind === "selectingSwapCards"
        ? selectionHighlight(expected.slotIndices, intent, selfId, DISCARD_PILE)
        : undoHighlight(intent, selfId);
    case "viewOwnCard":
    case "viewOtherCard":
    case "exchangeBlind":
      if (intent.kind === "none") {
        return pointAt(HELD_CARD);
      }
      return intent.kind === "action"
        ? actionTargetHighlight(expected, intent, selfId)
        : undoHighlight(intent, selfId);
    case "viewStartingCards":
    case "drawFromDeck":
    case "swapDiscardCard":
    case "discardDrawnCard":
    case "callEnd":
      return noHighlight;
  }
}

export function tutorialHighlight(
  expected: ExpectedMove,
  intent: Intent,
  state: StartedGame,
  selfId: PlayerId,
): Highlight {
  const situation = situationOf(state, selfId);
  switch (situation.kind) {
    case "startingView":
      return startingViewHighlight(expected, intent, selfId);
    case "choosing":
      return choosingHighlight(expected, intent, selfId);
    case "holding":
      return holdingHighlight(expected, intent, selfId);
    case "waiting":
      return noHighlight;
  }
}
