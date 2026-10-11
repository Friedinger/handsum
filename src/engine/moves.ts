import type { Player, PlayerId } from "./types";

export interface StartGameMove {
  readonly type: "startGame";
  readonly playerId: PlayerId;
  readonly players: readonly Player[];
  readonly seed: number;
}

export interface ReadyMove {
  readonly type: "ready";
  readonly playerId: PlayerId;
}

export interface DrawFromDeckMove {
  readonly type: "drawFromDeck";
  readonly playerId: PlayerId;
}

export interface DiscardDrawnCardMove {
  readonly type: "discardDrawnCard";
  readonly playerId: PlayerId;
}

export interface SwapDrawnCardMove {
  readonly type: "swapDrawnCard";
  readonly playerId: PlayerId;
  readonly slotIndex: number;
}

export interface SwapDiscardCardMove {
  readonly type: "swapDiscardCard";
  readonly playerId: PlayerId;
  readonly slotIndex: number;
}

export type Move =
  | StartGameMove
  | ReadyMove
  | DrawFromDeckMove
  | DiscardDrawnCardMove
  | SwapDrawnCardMove
  | SwapDiscardCardMove;
