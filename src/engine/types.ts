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

export interface InitialPeekPhase {
  readonly kind: "initialPeek";
  readonly readyPlayerIds: readonly PlayerId[];
}

export interface PlayingPhase {
  readonly kind: "playing";
  readonly currentPlayerId: PlayerId;
  readonly step: TurnStep;
}

export type Phase = InitialPeekPhase | PlayingPhase;

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
}

export type GameState = NotStartedGame | StartedGame;
