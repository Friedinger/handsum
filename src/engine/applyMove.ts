import type { Move } from "./moves";
import { applyCallEnd } from "./moves/callEnd";
import { applyExchangeBlind, applyViewOtherCard, applyViewOwnCard } from "./moves/cardActions";
import { applyDiscardDrawnCard, applyDrawFromDeck } from "./moves/draw";
import { applyStartGame } from "./moves/startGame";
import { applyViewStartingCards } from "./moves/startingView";
import { applySwapDiscardCard, applySwapDrawnCard } from "./moves/swap";
import { accept, type MoveRejection, type Result } from "./outcome";
import type { GameState, StartedGame } from "./types";

export const initialGameState: GameState = { status: "notStarted" };

export class IllegalMoveError extends Error {
  constructor(
    readonly reason: MoveRejection,
    readonly move: Move,
  ) {
    super(`Illegal move "${move.type}": ${reason}`);
    this.name = "IllegalMoveError";
  }
}

function dispatchMove(state: GameState, move: Move): Result<StartedGame> {
  switch (move.type) {
    case "startGame":
      return applyStartGame(state, move);
    case "viewStartingCards":
      return applyViewStartingCards(state, move);
    case "drawFromDeck":
      return applyDrawFromDeck(state, move);
    case "discardDrawnCard":
      return applyDiscardDrawnCard(state, move);
    case "swapDrawnCard":
      return applySwapDrawnCard(state, move);
    case "swapDiscardCard":
      return applySwapDiscardCard(state, move);
    case "viewOwnCard":
      return applyViewOwnCard(state, move);
    case "viewOtherCard":
      return applyViewOtherCard(state, move);
    case "exchangeBlind":
      return applyExchangeBlind(state, move);
    case "callEnd":
      return applyCallEnd(state, move);
  }
}

function withoutPreviousEvents(state: GameState): GameState {
  return state.status === "started" ? { ...state, lastMoveEvents: [] } : state;
}

export function tryApplyMove(state: GameState, move: Move): Result<StartedGame> {
  const outcome = dispatchMove(withoutPreviousEvents(state), move);
  if (!outcome.ok) {
    return outcome;
  }
  const previousMoveCount = state.status === "started" ? state.moveCount : 0;
  return accept({ ...outcome.value, moveCount: previousMoveCount + 1 });
}

export function validateMove(state: GameState, move: Move): MoveRejection | null {
  const outcome = tryApplyMove(state, move);
  return outcome.ok ? null : outcome.reason;
}

export function applyMove(state: GameState, move: Move): GameState {
  const outcome = tryApplyMove(state, move);
  if (!outcome.ok) {
    throw new IllegalMoveError(outcome.reason, move);
  }
  return outcome.value;
}

export function replayMoves(moves: readonly Move[]): GameState {
  return moves.reduce(applyMove, initialGameState);
}
