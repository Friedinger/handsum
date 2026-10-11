import type { ViewStartingCardsMove } from "../moves";
import { accept, reject, type Result } from "../outcome";
import { STARTING_VIEW_CARD_COUNT } from "../rules";
import { findSlotSelectionProblem, seatIndexOf } from "../state";
import type { GameState, Phase, PlayerId, StartedGame } from "../types";

function firstPlayerId(state: StartedGame): PlayerId {
  const firstSeat = state.seats[0];
  if (!firstSeat) {
    throw new Error("Game has no seats");
  }
  return firstSeat.player.id;
}

function phaseAfterViewing(state: StartedGame, viewedPlayerIds: ReadonlySet<PlayerId>): Phase {
  const everyoneViewed = state.seats.every((seat) => viewedPlayerIds.has(seat.player.id));
  if (everyoneViewed) {
    return {
      kind: "playing",
      currentPlayerId: firstPlayerId(state),
      step: { kind: "awaitingChoice" },
    };
  }
  // Seat order instead of arrival order keeps the state independent of who finished first.
  const viewedInSeatOrder = state.seats
    .map((seat) => seat.player.id)
    .filter((playerId) => viewedPlayerIds.has(playerId));
  return { kind: "startingView", viewedPlayerIds: viewedInSeatOrder };
}

// The chosen slots stay in the move only: the engine does not track what players know,
// and recording no event keeps the state independent of the order players view in.
export function applyViewStartingCards(
  state: GameState,
  move: ViewStartingCardsMove,
): Result<StartedGame> {
  if (state.status !== "started") {
    return reject("gameNotStarted");
  }
  const seat = state.seats[seatIndexOf(state, move.playerId)];
  if (!seat) {
    return reject("unknownPlayer");
  }
  if (state.phase.kind !== "startingView") {
    return reject("wrongPhase");
  }
  if (state.phase.viewedPlayerIds.includes(move.playerId)) {
    return reject("alreadyViewed");
  }
  const selectionProblem = findSlotSelectionProblem(seat.layout, move.slotIndices);
  if (selectionProblem) {
    return reject(selectionProblem);
  }
  if (move.slotIndices.length !== STARTING_VIEW_CARD_COUNT) {
    return reject("wrongCardCount");
  }
  const viewedPlayerIds = new Set([...state.phase.viewedPlayerIds, move.playerId]);
  return accept({ ...state, phase: phaseAfterViewing(state, viewedPlayerIds) });
}
