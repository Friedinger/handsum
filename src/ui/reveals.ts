import type { Card, Move, PlayerId, StartedGame } from "../engine";

export const STARTING_VIEW_REVEAL_MS = 8000;
export const VIEW_REVEAL_MS = 5000;
export const FAILED_SWAP_REVEAL_MS = 4000;

export interface Reveal {
  readonly ownerId: PlayerId;
  readonly slotIndex: number;
  readonly card: Card;
  readonly durationMs: number;
}

function startingViewReveals(state: StartedGame, move: Move, selfId: PlayerId): Reveal[] {
  if (move.type !== "viewStartingCards" || move.playerId !== selfId) {
    return [];
  }
  const layout = state.seats.find((seat) => seat.player.id === selfId)?.layout ?? [];
  return move.slotIndices.flatMap((slotIndex) => {
    const card = layout[slotIndex];
    return card ? [{ ownerId: selfId, slotIndex, card, durationMs: STARTING_VIEW_REVEAL_MS }] : [];
  });
}

function eventReveals(state: StartedGame, selfId: PlayerId): Reveal[] {
  return state.lastMoveEvents.flatMap((event): Reveal[] => {
    switch (event.type) {
      case "cardViewed":
        return event.viewerId === selfId
          ? [
              {
                ownerId: event.ownerId,
                slotIndex: event.slotIndex,
                card: event.card,
                durationMs: VIEW_REVEAL_MS,
              },
            ]
          : [];
      case "cardsRevealed":
        // Matching cards went to the discard pile; only a failed attempt leaves them in place.
        return event.matched
          ? []
          : event.cards.map((card, index) => ({
              ownerId: event.playerId,
              slotIndex: event.slotIndices[index] ?? -1,
              card,
              durationMs: FAILED_SWAP_REVEAL_MS,
            }));
      case "drawPileReshuffled":
        return [];
    }
  });
}

export function revealsAfterMove(state: StartedGame, move: Move, selfId: PlayerId): Reveal[] {
  return [...startingViewReveals(state, move, selfId), ...eventReveals(state, selfId)];
}

// Checking the card ID ends a reveal early when the card has left that slot in the meantime.
export function isRevealed(
  reveals: readonly Reveal[],
  state: StartedGame,
  ownerId: PlayerId,
  slotIndex: number,
): boolean {
  const currentCard = state.seats.find((seat) => seat.player.id === ownerId)?.layout[slotIndex];
  return reveals.some(
    (reveal) =>
      reveal.ownerId === ownerId &&
      reveal.slotIndex === slotIndex &&
      reveal.card.id === currentCard?.id,
  );
}
