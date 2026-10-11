export type MoveRejection =
  | "gameNotStarted"
  | "gameAlreadyStarted"
  | "invalidPlayerCount"
  | "invalidPlayerId"
  | "duplicatePlayerId"
  | "emptyPlayerName"
  | "invalidSeed"
  | "unknownPlayer"
  | "wrongPhase"
  | "alreadyReady"
  | "notYourTurn"
  | "wrongTurnStep"
  | "drawPileEmpty"
  | "discardPileEmpty"
  | "invalidSlot"
  | "emptySlot";

export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: MoveRejection };

export function accept<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function reject<T>(reason: MoveRejection): Result<T> {
  return { ok: false, reason };
}
