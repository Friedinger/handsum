import { strings } from "@/data/strings";
import { type Move, type PlayerId, type StartedGame } from "@/engine";
import { type Highlight, noHighlight } from "@/utils/tableHighlight";
import type { Intent } from "@/utils/tableIntent";
import { tutorialHighlight } from "@/utils/tutorialHighlight";
import {
  type Lesson,
  TUTORIAL_PLAN,
  type TutorialStepId,
} from "@/utils/tutorialScript";

export interface CoachText {
  readonly title: string;
  readonly text: string;
}

export interface TutorialGuide {
  readonly step: TutorialStepId;
  readonly coach: CoachText;
  readonly hintAgainst: (move: Move) => string | null;
  readonly highlight: (intent: Intent) => Highlight;
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
      return move.type === expected.type;
  }
}

function stepOf(
  state: StartedGame,
  selfId: PlayerId,
  playerMovesMade: number,
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
    return TUTORIAL_PLAN[playerMovesMade]?.step ?? "lastRound";
  }
  if (playerMovesMade >= TUTORIAL_PLAN.length) {
    return "lastRound";
  }
  return phase.kind === "startingView" ? "remember" : "watchOpponent";
}

function coachTextOf(step: TutorialStepId, position: number | null): CoachText {
  const { title, text } = strings.tutorial.steps[step];
  return {
    title,
    text: typeof text === "string" ? text : text(position ?? 0),
  };
}

export function guideFor(
  moves: readonly Move[],
  state: StartedGame,
  selfId: PlayerId,
): TutorialGuide {
  const playerMovesMade = moves.filter(
    (move) => move.playerId === selfId && move.type !== "startGame",
  ).length;
  const lesson = TUTORIAL_PLAN[playerMovesMade];
  const step = stepOf(state, selfId, playerMovesMade);
  const position = lesson?.position ?? null;
  return {
    step,
    coach: coachTextOf(step, position),
    hintAgainst: (move) =>
      !lesson || matches(lesson.move, move) ? null : lesson.hint,
    highlight: (intent) =>
      lesson
        ? tutorialHighlight(lesson.move, intent, state, selfId)
        : noHighlight,
  };
}
