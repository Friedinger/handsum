import { standardDeck } from "@/engine/deck";
import type { StartGameMove } from "@/engine/moves/types";
import {
  accept,
  reject,
  type MoveRejection,
  type Result,
} from "@/engine/outcome";
import { isValidSeed, shuffle } from "@/engine/random";
import { LAYOUT_SIZE, MAX_PLAYERS, MIN_PLAYERS } from "@/engine/rules";
import type { GameState, Player, Seat, StartedGame } from "@/engine/types";

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
  if (players.some((player) => player.name.trim().length === 0)) {
    return "emptyPlayerName";
  }
  return null;
}

function dealGame(players: readonly Player[], seed: number): StartedGame {
  const deck = shuffle(standardDeck, seed);
  const seats: Seat[] = players.map((player, seatIndex) => ({
    player,
    layout: deck.slice(seatIndex * LAYOUT_SIZE, (seatIndex + 1) * LAYOUT_SIZE),
  }));
  const [firstDiscard, ...drawPile] = deck.slice(players.length * LAYOUT_SIZE);
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

// A finished game can be followed by a new one in the same log, which is how a rematch works.
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
  if (!move.players.some((player) => player.id === move.playerId)) {
    return reject("unknownPlayer");
  }
  return accept(dealGame(move.players, move.seed));
}
