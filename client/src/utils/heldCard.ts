import { strings } from "@/data/strings";
import type { Card, PlayerId, StartedGame } from "@/engine";
import { displayName } from "@/utils/displayName";

export interface HeldCard {
  readonly holderId: PlayerId;
  readonly card: Card;
}

export function currentHeldCard(state: StartedGame): HeldCard | null {
  const { phase } = state;
  if (phase.kind !== "playing" || phase.step.kind !== "holdingDrawnCard") {
    return null;
  }
  return { holderId: phase.currentPlayerId, card: phase.step.card };
}

/**
 * While the discard card is taken it is shown like a drawn card, with the next one below it.
 */
export function shownHeldCard(
  state: StartedGame,
  selfId: PlayerId,
  takingDiscard: boolean,
): HeldCard | null {
  const topDiscard = state.discardPile[0];
  return takingDiscard && topDiscard
    ? { holderId: selfId, card: topDiscard }
    : currentHeldCard(state);
}

export function heldCardLabel(
  state: StartedGame,
  selfId: PlayerId,
  held: HeldCard | null,
  takingDiscard: boolean,
): string | null {
  if (!held) {
    return null;
  }
  if (takingDiscard) {
    return strings.table.takenCard;
  }
  return held.holderId === selfId
    ? strings.table.yourCard
    : strings.table.holdingCard(displayName(state, held.holderId));
}
