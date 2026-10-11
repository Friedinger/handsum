import {
  initialGameState,
  tryApplyMove,
  type GameState,
  type Move,
  type MoveRejection,
  type StartGameMove,
} from "../engine";
import type { HelloMessage, MoveMessage } from "./protocol";

export interface SyncedLog {
  readonly moves: readonly Move[];
  readonly state: GameState;
}

export type SyncRejection = MoveRejection | "wrongSender" | "otherGame" | "staleSequence";

export type ReceiveOutcome =
  | { readonly kind: "accepted"; readonly log: SyncedLog }
  | { readonly kind: "duplicate" }
  | { readonly kind: "behind" }
  | { readonly kind: "rejected"; readonly reason: SyncRejection };

export const emptyLog: SyncedLog = { moves: [], state: initialGameState };

function isSameMove(a: Move | undefined, b: Move): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function startMoveOf(moves: readonly Move[]): StartGameMove | null {
  const [first] = moves;
  return first?.type === "startGame" ? first : null;
}

// Anyone may start, so two starts can cross on the network. Every client settles this the
// same way: the start by the lower player ID wins.
function startWins(candidate: StartGameMove, current: StartGameMove): boolean {
  return candidate.playerId < current.playerId;
}

export function startSeedOf(moves: readonly Move[]): number | null {
  return startMoveOf(moves)?.seed ?? null;
}

export function appendMove(log: SyncedLog, move: Move): ReceiveOutcome {
  const outcome = tryApplyMove(log.state, move);
  if (!outcome.ok) {
    return { kind: "rejected", reason: outcome.reason };
  }
  return { kind: "accepted", log: { moves: [...log.moves, move], state: outcome.value } };
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

function receiveCompetingStart(log: SyncedLog, start: StartGameMove): ReceiveOutcome {
  const currentStart = startMoveOf(log.moves);
  if (!currentStart || !startWins(start, currentStart)) {
    return { kind: "rejected", reason: "gameAlreadyStarted" };
  }
  const restarted = replayLog([start]);
  return restarted
    ? { kind: "accepted", log: restarted }
    : { kind: "rejected", reason: "invalidSeed" };
}

// Viewing the starting cards is the only move players make at the same time. It commutes in
// the engine, so one that lost the race for its sequence number is still appended.
function receiveStaleMove(log: SyncedLog, move: Move): ReceiveOutcome {
  if (move.type === "startGame") {
    return receiveCompetingStart(log, move);
  }
  if (move.type !== "viewStartingCards") {
    return { kind: "rejected", reason: "staleSequence" };
  }
  const outcome = appendMove(log, move);
  return outcome.kind === "rejected" && outcome.reason === "alreadyViewed"
    ? { kind: "duplicate" }
    : outcome;
}

function belongsToOtherGame(log: SyncedLog, message: MoveMessage): boolean {
  const startSeed = startSeedOf(log.moves);
  return message.move.type !== "startGame" && startSeed !== null && startSeed !== message.startSeed;
}

export function receiveMove(
  log: SyncedLog,
  message: MoveMessage,
  sender: HelloMessage,
): ReceiveOutcome {
  if (message.move.playerId !== sender.playerId) {
    return { kind: "rejected", reason: "wrongSender" };
  }
  if (belongsToOtherGame(log, message)) {
    return { kind: "rejected", reason: "otherGame" };
  }
  const expectedSequence = log.moves.length + 1;
  if (message.sequence > expectedSequence) {
    return { kind: "behind" };
  }
  if (isSameMove(log.moves[message.sequence - 1], message.move)) {
    return { kind: "duplicate" };
  }
  if (message.sequence < expectedSequence) {
    return receiveStaleMove(log, message.move);
  }
  return appendMove(log, message.move);
}

function prefersIncoming(own: readonly Move[], incoming: readonly Move[]): boolean {
  const ownStart = startMoveOf(own);
  const incomingStart = startMoveOf(incoming);
  if (!incomingStart) {
    return false;
  }
  if (!ownStart) {
    return true;
  }
  if (!isSameMove(ownStart, incomingStart)) {
    return startWins(incomingStart, ownStart);
  }
  return incoming.length > own.length;
}

export function chooseLog(own: SyncedLog, incoming: readonly Move[]): SyncedLog | null {
  return prefersIncoming(own.moves, incoming) ? replayLog(incoming) : null;
}
