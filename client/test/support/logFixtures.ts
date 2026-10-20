import type { Move } from "@/engine";
import { appendMove, emptyLog, type SyncedLog } from "@/net/moveLog";

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

export function logOf(moves: readonly Move[]): SyncedLog {
  const log = replayLog(moves);
  if (!log) {
    throw new Error("The moves are not a legal log");
  }
  return log;
}
