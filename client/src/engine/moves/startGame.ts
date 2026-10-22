import { arrangeDeck, standardDeck } from "@/engine/deck";
import type { StartGameMove } from "@/engine/moves/types";
import {
  accept,
  type MoveRejection,
  reject,
  type Result,
} from "@/engine/outcome";
import { isValidSeed, shuffle } from "@/engine/random";
import {
  isValidPlayerName,
  LAYOUT_SIZE,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from "@/engine/rules";
import type {
  Card,
  GameState,
  Player,
  Seat,
  StartedGame,
} from "@/engine/types";

function findPlayerListProblem(
  players: readonly Player[],
): MoveRejection | null {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    return "invalidPlayerCount";
  }
  if (players.some((player) => player.id.length === 0)) {
    return "invalidPlayerId";
  }
  if (new Set(players.map((player) => player.id)).size !== players.length) {
    return "duplicatePlayerId";
  }
  if (players.some((player) => !isValidPlayerName(player.name))) {
    return "invalidPlayerName";
  }
  return null;
}

function dealGame(
  players: readonly Player[],
  seed: number,
  deck: readonly Card[],
): StartedGame {
  const seats: Seat[] = players.map((player, seatIndex) => ({
    player,
    layout: deck.slice(seatIndex * LAYOUT_SIZE, (seatIndex + 1) * LAYOUT_SIZE),
  }));
  const [firstDiscard, ...drawPile] = deck.slice(players.length * LAYOUT_SIZE);
  // Unreachable: even the smallest deck covers the maximum number of players. Only narrows the type.
  if (!firstDiscard) {
    throw new Error("Deck is too small to deal");
  }
  return {
    status: "started",
    seed,
    moveCount: 0,
    seats,
    drawPile,
    discardPile: [firstDiscard],
    phase: { kind: "startingView", viewedPlayerIds: [] },
    endCallerId: null,
    lastMoveEvents: [],
  };
}

/**
 * A finished game can be followed by a new one in the same log, which is how a rematch works.
 */
function isRunning(state: GameState): boolean {
  return state.status === "started" && state.phase.kind !== "finished";
}

export function applyStartGame(
  state: GameState,
  move: StartGameMove,
): Result<StartedGame> {
  if (isRunning(state)) {
    return reject("gameAlreadyStarted");
  }
  const playerListProblem = findPlayerListProblem(move.players);
  if (playerListProblem) {
    return reject(playerListProblem);
  }
  if (!isValidSeed(move.seed)) {
    return reject("invalidSeed");
  }
  const deck =
    move.deck === undefined
      ? shuffle(standardDeck, move.seed)
      : arrangeDeck(move.deck);
  if (!deck) {
    return reject("invalidDeck");
  }
  if (!move.players.some((player) => player.id === move.playerId)) {
    return reject("unknownPlayer");
  }
  return accept(dealGame(move.players, move.seed, deck));
}
