import {
  type GameState,
  initialGameState,
  type Move,
  type MoveRejection,
  type PlayerResult,
  tryApplyMove,
} from "@/engine";

export interface SyncedLog {
  readonly moves: readonly Move[];
  readonly state: GameState;
  readonly finishedRounds: readonly (readonly PlayerResult[])[];
}

type AppendOutcome =
  | { readonly kind: "accepted"; readonly log: SyncedLog }
  | { readonly kind: "rejected"; readonly reason: MoveRejection };

export const emptyLog: SyncedLog = {
  moves: [],
  state: initialGameState,
  finishedRounds: [],
};

/**
 * The only legal move after a finished round is the next start, so every move that ends in a
 * finished phase is the one that finished a round.
 */
function withFinishedRound(
  finishedRounds: SyncedLog["finishedRounds"],
  state: GameState,
): SyncedLog["finishedRounds"] {
  return state.status === "started" && state.phase.kind === "finished"
    ? [...finishedRounds, state.phase.results]
    : finishedRounds;
}

export function appendMove(log: SyncedLog, move: Move): AppendOutcome {
  const outcome = tryApplyMove(log.state, move);
  if (!outcome.ok) {
    return { kind: "rejected", reason: outcome.reason };
  }
  return {
    kind: "accepted",
    log: {
      moves: [...log.moves, move],
      state: outcome.value,
      finishedRounds: withFinishedRound(log.finishedRounds, outcome.value),
    },
  };
}

/**
 * The server orders all moves, so a batch only has to be applied after the moves already known.
 * It stops at the first illegal move, because everything after it would build on a broken log.
 */
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
