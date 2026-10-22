export type MoveRejection =
  | "gameNotStarted"
  | "gameAlreadyStarted"
  | "invalidPlayerCount"
  | "invalidPlayerId"
  | "duplicatePlayerId"
  | "invalidPlayerName"
  | "invalidSeed"
  | "invalidDeck"
  | "unknownPlayer"
  | "wrongPhase"
  | "alreadyViewed"
  | "wrongCardCount"
  | "notYourTurn"
  | "wrongTurnStep"
  | "drawPileEmpty"
  | "discardPileEmpty"
  | "invalidSlot"
  | "duplicateSlot"
  | "noSlotSelected"
  | "emptySlot"
  | "wrongCardAction"
  | "invalidTarget"
  | "endAlreadyCalled";

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: MoveRejection };

export function accept<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function reject<T>(reason: MoveRejection): Result<T> {
  return { ok: false, reason };
}
