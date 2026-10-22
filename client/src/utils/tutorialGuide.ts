import { type Move, type PlayerId, type StartedGame } from "@/engine";
import {
  type Lesson,
  TUTORIAL_PLAN,
  type TutorialStepId,
} from "@/utils/tutorialScript";

export interface TutorialGuide {
  readonly step: TutorialStepId;
  readonly position: number | null;
  readonly hintAgainst: (move: Move) => string | null;
}

function sameSlots(
  actual: readonly number[],
  expected: readonly number[],
): boolean {
  return (
    actual.length === expected.length &&
    expected.every((slotIndex) => actual.includes(slotIndex))
  );
}

function matches(expected: Lesson["move"], move: Move): boolean {
  switch (expected.type) {
    case "viewStartingCards":
    case "swapDrawnCard":
    case "swapDiscardCard":
      return (
        move.type === expected.type &&
        sameSlots(move.slotIndices, expected.slotIndices)
      );
    case "viewOwnCard":
      return (
        move.type === expected.type && move.slotIndex === expected.slotIndex
      );
    case "viewOtherCard":
      return (
        move.type === expected.type &&
        move.targetPlayerId === expected.targetPlayerId &&
        move.slotIndex === expected.slotIndex
      );
    case "exchangeBlind":
      return (
        move.type === expected.type &&
        move.ownSlotIndex === expected.ownSlotIndex &&
        move.targetPlayerId === expected.targetPlayerId &&
        move.targetSlotIndex === expected.targetSlotIndex
      );
    case "drawFromDeck":
    case "discardDrawnCard":
    case "callEnd":
    case "startGame":
      return move.type === expected.type;
  }
}

function stepOf(
  state: StartedGame,
  selfId: PlayerId,
  lessonsDone: number,
): TutorialStepId {
  const { phase } = state;
  if (phase.kind === "finished") {
    return "results";
  }
  const waiting =
    phase.kind === "startingView"
      ? phase.viewedPlayerIds.includes(selfId)
      : phase.currentPlayerId !== selfId;
  if (!waiting) {
    return TUTORIAL_PLAN[lessonsDone]?.step ?? "lastRound";
  }
  if (lessonsDone >= TUTORIAL_PLAN.length) {
    return "lastRound";
  }
  return lessonsDone <= 1 ? "remember" : "watchOpponent";
}

export function guideFor(
  moves: readonly Move[],
  state: StartedGame,
  selfId: PlayerId,
): TutorialGuide {
  const lessonsDone = moves.filter(
    (move) => move.playerId === selfId && move.type !== "startGame",
  ).length;
  const lesson = TUTORIAL_PLAN[lessonsDone];
  return {
    step: stepOf(state, selfId, lessonsDone),
    position: lesson?.position ?? null,
    hintAgainst: (move) =>
      !lesson || matches(lesson.move, move) ? null : lesson.hint,
  };
}
