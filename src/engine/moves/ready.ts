import type { ReadyMove } from "../moves";
import { accept, reject, type Result } from "../outcome";
import { seatIndexOf } from "../state";
import type { GameState, Phase, PlayerId, StartedGame } from "../types";

function firstPlayerId(state: StartedGame): PlayerId {
  const firstSeat = state.seats[0];
  if (!firstSeat) {
    throw new Error("Game has no seats");
  }
  return firstSeat.player.id;
}

function phaseAfterReady(state: StartedGame, readyPlayerIds: ReadonlySet<PlayerId>): Phase {
  const everyoneReady = state.seats.every((seat) => readyPlayerIds.has(seat.player.id));
  if (everyoneReady) {
    return {
      kind: "playing",
      currentPlayerId: firstPlayerId(state),
      step: { kind: "awaitingChoice" },
    };
  }
  // Seat order instead of arrival order keeps the state independent of who got ready first.
  const readyInSeatOrder = state.seats
    .map((seat) => seat.player.id)
    .filter((playerId) => readyPlayerIds.has(playerId));
  return { kind: "initialPeek", readyPlayerIds: readyInSeatOrder };
}

export function applyReady(state: GameState, move: ReadyMove): Result<StartedGame> {
  if (state.status !== "started") {
    return reject("gameNotStarted");
  }
  if (seatIndexOf(state, move.playerId) === -1) {
    return reject("unknownPlayer");
  }
  if (state.phase.kind !== "initialPeek") {
    return reject("wrongPhase");
  }
  if (state.phase.readyPlayerIds.includes(move.playerId)) {
    return reject("alreadyReady");
  }
  const readyPlayerIds = new Set([...state.phase.readyPlayerIds, move.playerId]);
  return accept({ ...state, phase: phaseAfterReady(state, readyPlayerIds) });
}
