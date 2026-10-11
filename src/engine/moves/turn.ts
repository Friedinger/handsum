import { accept, reject, type Result } from "../outcome";
import { scoreGame } from "../scoring";
import { nextPlayerId, seatIndexOf } from "../state";
import type {
  Card,
  GameEvent,
  GameState,
  PlayerId,
  Slot,
  StartedGame,
  TurnStep,
} from "../types";

export interface ActiveTurn {
  readonly state: StartedGame;
  readonly playerId: PlayerId;
  readonly seatIndex: number;
  readonly layout: readonly Slot[];
  readonly step: TurnStep;
}

export interface HeldCardTurn extends ActiveTurn {
  readonly heldCard: Card;
}

export function requireActiveTurn(
  state: GameState,
  playerId: PlayerId,
): Result<ActiveTurn> {
  if (state.status !== "started") {
    return reject("gameNotStarted");
  }
  const seatIndex = seatIndexOf(state, playerId);
  const seat = state.seats[seatIndex];
  if (!seat) {
    return reject("unknownPlayer");
  }
  if (state.phase.kind !== "playing") {
    return reject("wrongPhase");
  }
  if (state.phase.currentPlayerId !== playerId) {
    return reject("notYourTurn");
  }
  return accept({
    state,
    playerId,
    seatIndex,
    layout: seat.layout,
    step: state.phase.step,
  });
}

export function requireAwaitingChoice(
  state: GameState,
  playerId: PlayerId,
): Result<ActiveTurn> {
  const turn = requireActiveTurn(state, playerId);
  if (!turn.ok) {
    return turn;
  }
  return turn.value.step.kind === "awaitingChoice"
    ? turn
    : reject("wrongTurnStep");
}

export function requireHeldCard(
  state: GameState,
  playerId: PlayerId,
): Result<HeldCardTurn> {
  const turn = requireActiveTurn(state, playerId);
  if (!turn.ok) {
    return turn;
  }
  const { step } = turn.value;
  if (step.kind !== "holdingDrawnCard") {
    return reject("wrongTurnStep");
  }
  return accept({ ...turn.value, heldCard: step.card });
}

export function withEvent(state: StartedGame, event: GameEvent): StartedGame {
  return { ...state, lastMoveEvents: [...state.lastMoveEvents, event] };
}

// The caller does not play again: reaching the caller's seat means everyone else had their last turn.
export function endTurn(state: StartedGame, playerId: PlayerId): StartedGame {
  const nextId = nextPlayerId(state, playerId);
  if (nextId === state.endCallerId) {
    return {
      ...state,
      phase: { kind: "finished", results: scoreGame(state.seats, nextId) },
    };
  }
  return {
    ...state,
    phase: {
      kind: "playing",
      currentPlayerId: nextId,
      step: { kind: "awaitingChoice" },
    },
  };
}
