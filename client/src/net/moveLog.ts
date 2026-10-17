import {
  initialGameState,
  tryApplyMove,
  type GameState,
  type Move,
  type MoveRejection,
} from "@/engine";

export interface SyncedLog {
  readonly moves: readonly Move[];
  readonly state: GameState;
}

export type AppendOutcome =
  | { readonly kind: "accepted"; readonly log: SyncedLog }
  | { readonly kind: "rejected"; readonly reason: MoveRejection };

export const emptyLog: SyncedLog = { moves: [], state: initialGameState };

export function appendMove(log: SyncedLog, move: Move): AppendOutcome {
  const outcome = tryApplyMove(log.state, move);
  if (!outcome.ok) {
    return { kind: "rejected", reason: outcome.reason };
  }
  return {
    kind: "accepted",
    log: { moves: [...log.moves, move], state: outcome.value },
  };
}

export function replayLog(moves: readonly Move[]): SyncedLog | null {
  let log = emptyLog;
  for (const move of moves) {
    const outcome = appendMove(log, move);
    if (outcome.kind !== "accepted") {
      return null;
    }
    log = outcome.log;
  }
  return log;
}

// The server orders all moves, so a batch only has to be applied after the moves already known.
// It stops at the first illegal move, because everything after it would build on a broken log.
export function extendLog(
  log: SyncedLog,
  firstIndex: number,
  moves: readonly Move[],
): SyncedLog {
  if (firstIndex > log.moves.length) {
    return log;
  }
  let extended = log;
  for (const move of moves.slice(log.moves.length - firstIndex)) {
    const outcome = appendMove(extended, move);
    if (outcome.kind !== "accepted") {
      return extended;
    }
    extended = outcome.log;
  }
  return extended;
}
