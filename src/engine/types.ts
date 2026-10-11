export type PlayerId = string;

export type CardAction = "viewOwn" | "viewOther" | "exchangeBlind";

export interface Card {
  readonly id: number;
  readonly value: number;
  readonly points: number;
  readonly action: CardAction | null;
}

export type Slot = Card | null;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
}

export interface Seat {
  readonly player: Player;
  readonly layout: readonly Slot[];
}

export type TurnStep = { readonly kind: "awaitingChoice" } | HoldingDrawnCardStep;

export interface HoldingDrawnCardStep {
  readonly kind: "holdingDrawnCard";
  readonly card: Card;
}

export interface StartingViewPhase {
  readonly kind: "startingView";
  readonly viewedPlayerIds: readonly PlayerId[];
}

export interface PlayingPhase {
  readonly kind: "playing";
  readonly currentPlayerId: PlayerId;
  readonly step: TurnStep;
}

export interface PlayerResult {
  readonly playerId: PlayerId;
  readonly cardSum: number;
  readonly score: number;
  readonly isWinner: boolean;
}

export interface FinishedPhase {
  readonly kind: "finished";
  readonly results: readonly PlayerResult[];
}

export type Phase = StartingViewPhase | PlayingPhase | FinishedPhase;

export type GameEvent =
  | { readonly type: "drawPileReshuffled"; readonly cardCount: number }
  | {
      readonly type: "cardsRevealed";
      readonly playerId: PlayerId;
      readonly slotIndices: readonly number[];
      readonly cards: readonly Card[];
      readonly matched: boolean;
    }
  | {
      readonly type: "cardViewed";
      readonly viewerId: PlayerId;
      readonly ownerId: PlayerId;
      readonly slotIndex: number;
      readonly card: Card;
    };

export interface NotStartedGame {
  readonly status: "notStarted";
}

export interface StartedGame {
  readonly status: "started";
  readonly seed: number;
  readonly moveCount: number;
  readonly seats: readonly Seat[];
  readonly drawPile: readonly Card[];
  readonly discardPile: readonly Card[];
  readonly phase: Phase;
  readonly endCallerId: PlayerId | null;
  readonly lastMoveEvents: readonly GameEvent[];
}

export type GameState = NotStartedGame | StartedGame;
