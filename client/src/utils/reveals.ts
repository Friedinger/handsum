import {
  cardAt,
  type Card,
  type Move,
  type PlayerId,
  type StartedGame,
} from "@/engine";

export const STARTING_VIEW_REVEAL_MS = 8000;
export const VIEW_REVEAL_MS = 5000;
const FAILED_SWAP_REVEAL_MS = 4000;

export type RevealReason = "startingView" | "viewed" | "failedSwap";

export interface Reveal {
  readonly reason: RevealReason;
  readonly ownerId: PlayerId;
  readonly slotIndex: number;
  readonly card: Card;
  readonly durationMs: number;
}

function startingViewReveals(
  state: StartedGame,
  move: Move,
  selfId: PlayerId,
): Reveal[] {
  if (move.type !== "viewStartingCards" || move.playerId !== selfId) {
    return [];
  }
  return move.slotIndices.flatMap((slotIndex) => {
    const card = cardAt(state, selfId, slotIndex);
    return card
      ? [
          {
            reason: "startingView",
            ownerId: selfId,
            slotIndex,
            card,
            durationMs: STARTING_VIEW_REVEAL_MS,
          },
        ]
      : [];
  });
}

function eventReveals(state: StartedGame, selfId: PlayerId): Reveal[] {
  return state.lastMoveEvents.flatMap((event): Reveal[] => {
    switch (event.type) {
      case "cardViewed":
        return event.viewerId === selfId
          ? [
              {
                reason: "viewed",
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
          : event.cards.flatMap((card, index) => {
              const slotIndex = event.slotIndices[index];
              return slotIndex === undefined
                ? []
                : [
                    {
                      reason: "failedSwap",
                      ownerId: event.playerId,
                      slotIndex,
                      card,
                      durationMs: FAILED_SWAP_REVEAL_MS,
                    },
                  ];
            });
      case "drawPileReshuffled":
        return [];
    }
  });
}

export function revealsAfterMove(
  state: StartedGame,
  move: Move,
  selfId: PlayerId,
): Reveal[] {
  return [
    ...startingViewReveals(state, move, selfId),
    ...eventReveals(state, selfId),
  ];
}

// Checking the card ID ends a reveal early when the card has left that slot in the meantime.
export function isRevealed(
  reveals: readonly Reveal[],
  state: StartedGame,
  ownerId: PlayerId,
  slotIndex: number,
): boolean {
  const currentCard = cardAt(state, ownerId, slotIndex);
  return reveals.some(
    (reveal) =>
      reveal.ownerId === ownerId &&
      reveal.slotIndex === slotIndex &&
      reveal.card.id === currentCard?.id,
  );
}
