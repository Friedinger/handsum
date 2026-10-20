import {
  type ActiveTurn,
  endTurn,
  requireAwaitingChoice,
  requireHeldCard,
  withEvent,
} from "@/engine/moves/turn";
import type {
  SwapDiscardCardMove,
  SwapDrawnCardMove,
} from "@/engine/moves/types";
import { accept, reject, type Result } from "@/engine/outcome";
import { findSlotSelectionProblem, withLayout } from "@/engine/state";
import type { Card, GameState, Slot, StartedGame } from "@/engine/types";

const MULTI_SWAP_MIN_CARDS = 2;

function cardsAt(
  layout: readonly Slot[],
  slotIndices: readonly number[],
): Card[] {
  return slotIndices
    .map((slotIndex) => layout[slotIndex])
    .filter((slot) => slot != null);
}

function haveSameValue(cards: readonly Card[]): boolean {
  return cards.every((card) => card.value === cards[0]?.value);
}

/**
 * The incoming card takes the lowest selected slot; the remaining selected slots stay empty.
 */
function layoutAfterSwap(
  layout: readonly Slot[],
  slotIndices: readonly number[],
  incomingCard: Card,
): Slot[] {
  const targetSlot = Math.min(...slotIndices);
  return layout.map((slot, slotIndex) => {
    if (slotIndex === targetSlot) {
      return incomingCard;
    }
    return slotIndices.includes(slotIndex) ? null : slot;
  });
}

function swapIntoLayout(
  turn: ActiveTurn,
  incomingCard: Card,
  slotIndices: readonly number[],
  discardPileBelow: readonly Card[],
): Result<StartedGame> {
  const { state, playerId, seatIndex, layout } = turn;
  const selectionProblem = findSlotSelectionProblem(layout, slotIndices);
  if (selectionProblem) {
    return reject(selectionProblem);
  }
  const outgoingCards = cardsAt(layout, slotIndices);
  const matched = haveSameValue(outgoingCards);
  const revealed =
    slotIndices.length >= MULTI_SWAP_MIN_CARDS
      ? withEvent(state, {
          type: "cardsRevealed",
          playerId,
          slotIndices,
          cards: outgoingCards,
          matched,
        })
      : state;
  const afterSwap: StartedGame = matched
    ? {
        ...revealed,
        seats: withLayout(
          state.seats,
          seatIndex,
          layoutAfterSwap(layout, slotIndices, incomingCard),
        ),
        discardPile: [...outgoingCards, ...discardPileBelow],
      }
    : { ...revealed, discardPile: [incomingCard, ...discardPileBelow] };
  return accept(endTurn(afterSwap, playerId));
}

export function applySwapDrawnCard(
  state: GameState,
  move: SwapDrawnCardMove,
): Result<StartedGame> {
  const turn = requireHeldCard(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  return swapIntoLayout(
    turn.value,
    turn.value.heldCard,
    move.slotIndices,
    turn.value.state.discardPile,
  );
}

export function applySwapDiscardCard(
  state: GameState,
  move: SwapDiscardCardMove,
): Result<StartedGame> {
  const turn = requireAwaitingChoice(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  const [takenCard, ...discardPileBelow] = turn.value.state.discardPile;
  if (!takenCard) {
    return reject("discardPileEmpty");
  }
  return swapIntoLayout(
    turn.value,
    takenCard,
    move.slotIndices,
    discardPileBelow,
  );
}
