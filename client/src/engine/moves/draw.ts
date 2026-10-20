import type {
  DiscardDrawnCardMove,
  DrawFromDeckMove,
} from "@/engine/moves/types";
import { accept, reject, type Result } from "@/engine/outcome";
import { deriveSeed, shuffle } from "@/engine/random";
import type { GameState, StartedGame } from "@/engine/types";
import {
  discardHeldCard,
  requireAwaitingChoice,
  requireHeldCard,
  withEvent,
} from "@/engine/moves/turn";

// The reshuffle seed depends on the move number so repeated reshuffles differ but stay replayable.
function replenishDrawPile(state: StartedGame): StartedGame {
  const [topDiscard, ...reusableCards] = state.discardPile;
  if (state.drawPile.length > 0 || !topDiscard || reusableCards.length === 0) {
    return state;
  }
  const reshuffled = {
    ...state,
    drawPile: shuffle(reusableCards, deriveSeed(state.seed, state.moveCount)),
    discardPile: [topDiscard],
  };
  return withEvent(reshuffled, {
    type: "drawPileReshuffled",
    cardCount: reusableCards.length,
  });
}

export function applyDrawFromDeck(
  state: GameState,
  move: DrawFromDeckMove,
): Result<StartedGame> {
  const turn = requireAwaitingChoice(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  const replenished = replenishDrawPile(turn.value.state);
  const [drawnCard, ...drawPile] = replenished.drawPile;
  if (!drawnCard) {
    return reject("drawPileEmpty");
  }
  return accept({
    ...replenished,
    drawPile,
    phase: {
      kind: "playing",
      currentPlayerId: move.playerId,
      step: { kind: "holdingDrawnCard", card: drawnCard },
    },
  });
}

export function applyDiscardDrawnCard(
  state: GameState,
  move: DiscardDrawnCardMove,
): Result<StartedGame> {
  const turn = requireHeldCard(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  return accept(discardHeldCard(turn.value));
}
