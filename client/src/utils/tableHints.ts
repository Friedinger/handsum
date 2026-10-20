import { strings } from "@/data/strings";
import type { PlayerId, StartedGame } from "@/engine";
import { displayName } from "@/utils/displayName";
import {
  type Intent,
  isSwappingSeveral,
  selectedOwnSlots,
  situationOf,
} from "@/utils/tableIntent";

function waitingHint(state: StartedGame): string {
  const { phase } = state;
  switch (phase.kind) {
    case "finished":
      return strings.hints.finished;
    case "startingView":
      return strings.hints.waitingForStartingView;
    case "playing":
      return strings.hints.othersTurn(
        displayName(state, phase.currentPlayerId),
      );
  }
}

export function hintFor(
  state: StartedGame,
  selfId: PlayerId,
  intent: Intent,
): string {
  const { hints } = strings;
  if (isSwappingSeveral(intent)) {
    return selectedOwnSlots(intent).length > 0
      ? hints.severalCardsSelected
      : hints.severalCards;
  }
  const situation = situationOf(state, selfId);
  switch (situation.kind) {
    case "startingView":
      return hints.startingView;
    case "choosing":
      return intent.kind === "takingDiscard"
        ? hints.takingDiscard
        : hints.choosing;
    case "holding":
      if (intent.kind === "action") {
        return hints[intent.action];
      }
      return situation.card.action ? hints.holdingAction : hints.holding;
    case "waiting":
      return waitingHint(state);
  }
}
