import { appendMove, emptyLog, type SyncedLog } from "@/net/moveLog";
import type { Move } from "@/engine";

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
