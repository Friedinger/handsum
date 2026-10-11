import {
  initialGameState,
  tryApplyMove,
  type GameState,
  type Move,
  type MoveRejection,
} from "../engine";
import type { HelloMessage, MoveMessage } from "./protocol";

export interface SyncedLog {
  readonly moves: readonly Move[];
  readonly state: GameState;
}

export type SyncRejection = MoveRejection | "wrongSender" | "notHost" | "staleSequence";

export type ReceiveOutcome =
  | { readonly kind: "appended"; readonly log: SyncedLog }
  | { readonly kind: "duplicate" }
  | { readonly kind: "behind" }
  | { readonly kind: "rejected"; readonly reason: SyncRejection };

export const emptyLog: SyncedLog = { moves: [], state: initialGameState };

function isSameMove(a: Move | undefined, b: Move): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function findSenderProblem(move: Move, sender: HelloMessage): SyncRejection | null {
  if (move.playerId !== sender.playerId) {
    return "wrongSender";
  }
  if (move.type === "startGame" && !sender.isHost) {
    return "notHost";
  }
  return null;
}

export function appendMove(log: SyncedLog, move: Move): ReceiveOutcome {
  const outcome = tryApplyMove(log.state, move);
  if (!outcome.ok) {
    return { kind: "rejected", reason: outcome.reason };
  }
  return { kind: "appended", log: { moves: [...log.moves, move], state: outcome.value } };
}

// Ready moves are the only ones players send at the same time. They commute in the engine,
// so one that lost the race for its sequence number is still appended instead of dropped.
function receiveStaleMove(log: SyncedLog, message: MoveMessage): ReceiveOutcome {
  if (message.move.type !== "ready") {
    return { kind: "rejected", reason: "staleSequence" };
  }
  const outcome = appendMove(log, message.move);
  return outcome.kind === "rejected" && outcome.reason === "alreadyReady"
    ? { kind: "duplicate" }
    : outcome;
}

export function receiveMove(
  log: SyncedLog,
  message: MoveMessage,
  sender: HelloMessage,
): ReceiveOutcome {
  const senderProblem = findSenderProblem(message.move, sender);
  if (senderProblem) {
    return { kind: "rejected", reason: senderProblem };
  }
  const expectedSequence = log.moves.length + 1;
  if (message.sequence > expectedSequence) {
    return { kind: "behind" };
  }
  if (isSameMove(log.moves[message.sequence - 1], message.move)) {
    return { kind: "duplicate" };
  }
  if (message.sequence < expectedSequence) {
    return receiveStaleMove(log, message);
  }
  return appendMove(log, message.move);
}

export function replayLog(moves: readonly Move[]): SyncedLog | null {
  let log = emptyLog;
  for (const move of moves) {
    const outcome = appendMove(log, move);
    if (outcome.kind !== "appended") {
      return null;
    }
    log = outcome.log;
  }
  return log;
}

export function adoptLongerLog(own: SyncedLog, incoming: readonly Move[]): SyncedLog | null {
  if (incoming.length <= own.moves.length) {
    return null;
  }
  return replayLog(incoming);
}
