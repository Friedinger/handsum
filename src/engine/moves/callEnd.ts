import type { CallEndMove } from "../moves";
import { accept, reject, type Result } from "../outcome";
import type { GameState, StartedGame } from "../types";
import { endTurn, requireAwaitingChoice } from "./turn";

export function applyCallEnd(state: GameState, move: CallEndMove): Result<StartedGame> {
  const turn = requireAwaitingChoice(state, move.playerId);
  if (!turn.ok) {
    return turn;
  }
  if (turn.value.state.endCallerId !== null) {
    return reject("endAlreadyCalled");
  }
  return accept(endTurn({ ...turn.value.state, endCallerId: move.playerId }, move.playerId));
}
