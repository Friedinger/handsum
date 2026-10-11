import type {
  DiscardDrawnCardMove,
  DrawFromDeckMove,
  SwapDiscardCardMove,
  SwapDrawnCardMove,
} from "../moves";
import { accept, reject, type Result } from "../outcome";
import { nextPlayerId, replaceAt, seatIndexOf, withLayout } from "../state";
import type { Card, GameState, PlayerId, StartedGame, TurnStep } from "../types";

interface ActiveTurn {
  readonly state: StartedGame;
  readonly seatIndex: number;
  readonly step: TurnStep;
}

function requireActiveTurn(state: GameState, playerId: PlayerId): Result<ActiveTurn> {
  if (state.status !== "started") {
    return reject("gameNotStarted");
  }
  const seatIndex = seatIndexOf(state, playerId);
  if (seatIndex === -1) {
    return reject("unknownPlayer");
  }
  if (state.phase.kind !== "playing") {
    return reject("wrongPhase");
  }
  if (state.phase.currentPlayerId !== playerId) {
    return reject("notYourTurn");
  }
  return accept({ state, seatIndex, step: state.phase.step });
}

function endTurn(state: StartedGame, playerId: PlayerId): StartedGame {
  return {
    ...state,
    phase: {
      kind: "playing",
      currentPlayerId: nextPlayerId(state, playerId),
      step: { kind: "awaitingChoice" },
    },
  };
}

function exchangeIntoLayout(
  turn: ActiveTurn,
  incomingCard: Card,
  slotIndex: number,
  discardPileBelow: readonly Card[],
): Result<StartedGame> {
  const { state, seatIndex } = turn;
  const layout = state.seats[seatIndex]?.layout ?? [];
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= layout.length) {
    return reject("invalidSlot");
  }
  const outgoingCard = layout[slotIndex];
  if (!outgoingCard) {
    return reject("emptySlot");
  }
  return accept({
    ...state,
    seats: withLayout(state, seatIndex, replaceAt(layout, slotIndex, incomingCard)),
    discardPile: [outgoingCard, ...discardPileBelow],
  });
}

export function applyDrawFromDeck(state: GameState, move: DrawFromDeckMove): Result<StartedGame> {
  const turn = requireActiveTurn(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  if (turn.value.step.kind !== "awaitingChoice") {
    return reject("wrongTurnStep");
  }
  const [drawnCard, ...drawPile] = turn.value.state.drawPile;
  if (!drawnCard) {
    return reject("drawPileEmpty");
  }
  return accept({
    ...turn.value.state,
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
  const turn = requireActiveTurn(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  const { step } = turn.value;
  if (step.kind !== "holdingDrawnCard") {
    return reject("wrongTurnStep");
  }
  const afterDiscard = {
    ...turn.value.state,
    discardPile: [step.card, ...turn.value.state.discardPile],
  };
  return accept(endTurn(afterDiscard, move.playerId));
}

export function applySwapDrawnCard(state: GameState, move: SwapDrawnCardMove): Result<StartedGame> {
  const turn = requireActiveTurn(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  const { step } = turn.value;
  if (step.kind !== "holdingDrawnCard") {
    return reject("wrongTurnStep");
  }
  const exchanged = exchangeIntoLayout(
    turn.value,
    step.card,
    move.slotIndex,
    turn.value.state.discardPile,
  );
  return exchanged.ok ? accept(endTurn(exchanged.value, move.playerId)) : exchanged;
}

export function applySwapDiscardCard(
  state: GameState,
  move: SwapDiscardCardMove,
): Result<StartedGame> {
  const turn = requireActiveTurn(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  if (turn.value.step.kind !== "awaitingChoice") {
    return reject("wrongTurnStep");
  }
  const [takenCard, ...discardPileBelow] = turn.value.state.discardPile;
  if (!takenCard) {
    return reject("discardPileEmpty");
  }
  const exchanged = exchangeIntoLayout(turn.value, takenCard, move.slotIndex, discardPileBelow);
  return exchanged.ok ? accept(endTurn(exchanged.value, move.playerId)) : exchanged;
}
