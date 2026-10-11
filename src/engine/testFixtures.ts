import { applyMove, initialGameState } from "./applyMove";
import type { Move, StartGameMove } from "./moves";
import type { Card, GameState, Player, StartedGame } from "./types";

export const TEST_SEED = 12345;

export function createPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${String(index + 1)}`,
    name: `Player ${String(index + 1)}`,
  }));
}

export function startGameMove(playerCount = 3, seed = TEST_SEED): StartGameMove {
  const players = createPlayers(playerCount);
  return { type: "startGame", playerId: players[0]?.id ?? "", players, seed };
}

export function readyMoves(state: StartedGame): Move[] {
  return state.seats.map((seat) => ({ type: "ready", playerId: seat.player.id }));
}

export function expectStarted(state: GameState): StartedGame {
  if (state.status !== "started") {
    throw new Error("Expected a started game");
  }
  return state;
}

export function startedGame(playerCount = 3, seed = TEST_SEED): StartedGame {
  return expectStarted(applyMove(initialGameState, startGameMove(playerCount, seed)));
}

export function playingGame(playerCount = 3, seed = TEST_SEED): StartedGame {
  const started = startedGame(playerCount, seed);
  return expectStarted(readyMoves(started).reduce(applyMove, started));
}

export function allCards(state: StartedGame): Card[] {
  const layoutCards = state.seats.flatMap((seat) =>
    seat.layout.filter((slot): slot is Card => slot !== null),
  );
  const heldCards =
    state.phase.kind === "playing" && state.phase.step.kind === "holdingDrawnCard"
      ? [state.phase.step.card]
      : [];
  return [...layoutCards, ...state.drawPile, ...state.discardPile, ...heldCards];
}

export function currentPlayerId(state: StartedGame): string {
  if (state.phase.kind !== "playing") {
    throw new Error("Expected the playing phase");
  }
  return state.phase.currentPlayerId;
}
