import type { Card, PlayerId, StartedGame } from "@/engine";

export function isSlotVisibleTo(
  state: StartedGame,
  viewerId: PlayerId,
  ownerId: PlayerId,
  slotIndex: number,
): boolean {
  if (state.phase.kind === "finished") {
    return true;
  }
  return state.lastMoveEvents.some((event) => {
    switch (event.type) {
      case "cardViewed":
        return (
          event.viewerId === viewerId &&
          event.ownerId === ownerId &&
          event.slotIndex === slotIndex
        );
      case "cardsRevealed":
        return (
          !event.matched &&
          event.playerId === ownerId &&
          event.slotIndices.includes(slotIndex)
        );
      case "drawPileReshuffled":
        return false;
    }
  });
}

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

export function heldCardVisibleTo(
  state: StartedGame,
  viewerId: PlayerId,
): HeldCard | null {
  const held = currentHeldCard(state);
  return held?.holderId === viewerId ? held : null;
}
