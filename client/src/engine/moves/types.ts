import type { Player, PlayerId } from "@/engine/types";

export interface StartGameMove {
  readonly type: "startGame";
  readonly playerId: PlayerId;
  readonly players: readonly Player[];
  readonly seed: number;
}

export interface ViewStartingCardsMove {
  readonly type: "viewStartingCards";
  readonly playerId: PlayerId;
  readonly slotIndices: readonly number[];
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
  readonly slotIndices: readonly number[];
}

export interface SwapDiscardCardMove {
  readonly type: "swapDiscardCard";
  readonly playerId: PlayerId;
  readonly slotIndices: readonly number[];
}

export interface ViewOwnCardMove {
  readonly type: "viewOwnCard";
  readonly playerId: PlayerId;
  readonly slotIndex: number;
}

export interface ViewOtherCardMove {
  readonly type: "viewOtherCard";
  readonly playerId: PlayerId;
  readonly targetPlayerId: PlayerId;
  readonly slotIndex: number;
}

export interface ExchangeBlindMove {
  readonly type: "exchangeBlind";
  readonly playerId: PlayerId;
  readonly ownSlotIndex: number;
  readonly targetPlayerId: PlayerId;
  readonly targetSlotIndex: number;
}

export interface CallEndMove {
  readonly type: "callEnd";
  readonly playerId: PlayerId;
}

export type Move =
  | StartGameMove
  | ViewStartingCardsMove
  | DrawFromDeckMove
  | DiscardDrawnCardMove
  | SwapDrawnCardMove
  | SwapDiscardCardMove
  | ViewOwnCardMove
  | ViewOtherCardMove
  | ExchangeBlindMove
  | CallEndMove;

export type MoveType = Move["type"];
