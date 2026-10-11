import { applyMove, initialGameState } from "@/engine/applyMove";
import type { Move, StartGameMove } from "@/engine/moves";
import type {
  Card,
  CardAction,
  GameState,
  Player,
  Slot,
  StartedGame,
} from "@/engine/types";

export const TEST_SEED = 12345;

export function createPlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `player-${String(index + 1)}`,
    name: `Player ${String(index + 1)}`,
  }));
}

export function startGameMove(
  playerCount = 3,
  seed = TEST_SEED,
): StartGameMove {
  const players = createPlayers(playerCount);
  return { type: "startGame", playerId: players[0]?.id ?? "", players, seed };
}

export function startingViewMoves(state: StartedGame): Move[] {
  return state.seats.map((seat) => ({
    type: "viewStartingCards",
    playerId: seat.player.id,
    slotIndices: [0, 1],
  }));
}

export function expectStarted(state: GameState): StartedGame {
  if (state.status !== "started") {
    throw new Error("Expected a started game");
  }
  return state;
}

export function startedGame(playerCount = 3, seed = TEST_SEED): StartedGame {
  return expectStarted(
    applyMove(initialGameState, startGameMove(playerCount, seed)),
  );
}

// Fixes player-1 as the starting player so tests do not depend on the seed-based choice.
export function playingGame(playerCount = 3, seed = TEST_SEED): StartedGame {
  const started = startedGame(playerCount, seed);
  const playing = expectStarted(
    startingViewMoves(started).reduce(applyMove, started),
  );
  return {
    ...playing,
    phase: {
      kind: "playing",
      currentPlayerId: "player-1",
      step: { kind: "awaitingChoice" },
    },
  };
}

export function allCards(state: StartedGame): Card[] {
  const layoutCards = state.seats.flatMap((seat) =>
    seat.layout.filter((slot): slot is Card => slot !== null),
  );
  const heldCards =
    state.phase.kind === "playing" &&
    state.phase.step.kind === "holdingDrawnCard"
      ? [state.phase.step.card]
      : [];
  return [
    ...layoutCards,
    ...state.drawPile,
    ...state.discardPile,
    ...heldCards,
  ];
}

export function currentPlayerId(state: StartedGame): string {
  if (state.phase.kind !== "playing") {
    throw new Error("Expected the playing phase");
  }
  return state.phase.currentPlayerId;
}

const TEST_CARD_ID_OFFSET = 1000;

export function makeCard(
  value: number,
  action: CardAction | null = null,
  id = value,
): Card {
  return { id: TEST_CARD_ID_OFFSET + id, value, points: value, action };
}

export function withLayouts(
  state: StartedGame,
  layouts: readonly (readonly Slot[])[],
): StartedGame {
  return {
    ...state,
    seats: state.seats.map((seat, index) => ({
      ...seat,
      layout: layouts[index] ?? seat.layout,
    })),
  };
}

export function holding(state: StartedGame, card: Card): StartedGame {
  return {
    ...state,
    phase: {
      kind: "playing",
      currentPlayerId: currentPlayerId(state),
      step: { kind: "holdingDrawnCard", card },
    },
  };
}

export function layoutOf(
  state: StartedGame,
  seatIndex: number,
): readonly Slot[] {
  return state.seats[seatIndex]?.layout ?? [];
}
