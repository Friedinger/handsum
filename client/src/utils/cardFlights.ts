import {
  type Card,
  cardAt,
  type ExchangeBlindMove,
  type Move,
  type PlayerId,
  SLOT_INDICES,
  type StartedGame,
  type SwapDiscardCardMove,
  type SwapDrawnCardMove,
} from "@/engine";
import { currentHeldCard } from "@/utils/heldCard";
import type { SlotRef } from "@/utils/tableIntent";

export type Anchor =
  | { readonly kind: "drawPile" }
  | { readonly kind: "discardPile" }
  | { readonly kind: "held" }
  | { readonly kind: "slot"; readonly slot: SlotRef };

export interface Flight {
  readonly from: Anchor;
  readonly to: Anchor;
  readonly card: Card | null;
  readonly faceUpAtStart: boolean;
  readonly faceUpAtEnd: boolean;
  readonly order: number;
}

const MOVE_STAGGER_MS = 140;
const DEAL_STAGGER_MS = 70;

/** undefined: show the real top card; null: show an empty pile. */
export type DiscardTopOverride = Card | null | undefined;

export interface MovePlan {
  readonly flights: readonly Flight[];
  readonly staggerMs: number;
  readonly peekedSlot: SlotRef | null;
  /** What the discard pile shows until the cards flying onto it have landed. */
  readonly discardTopWhileFlying: DiscardTopOverride;
}

const drawPile: Anchor = { kind: "drawPile" };
const discardPile: Anchor = { kind: "discardPile" };
const held: Anchor = { kind: "held" };

export const DRAW_PILE_ANCHOR = anchorKey(drawPile);
export const DISCARD_PILE_ANCHOR = anchorKey(discardPile);
export const HELD_ANCHOR = anchorKey(held);
export const DISCARD_BELOW_ANCHOR = "discardBelow";

function movePlan(
  flights: readonly Flight[],
  overrides: Partial<Omit<MovePlan, "flights">> = {},
): MovePlan {
  return {
    flights,
    staggerMs: MOVE_STAGGER_MS,
    peekedSlot: null,
    discardTopWhileFlying: undefined,
    ...overrides,
  };
}

const noAnimation = movePlan([]);

export function anchorKey(anchor: Anchor): string {
  return anchor.kind === "slot"
    ? `slot:${anchor.slot.playerId}:${String(anchor.slot.slotIndex)}`
    : anchor.kind;
}

function slotAnchor(playerId: PlayerId, slotIndex: number): Anchor {
  return { kind: "slot", slot: { playerId, slotIndex } };
}

function heldCardOf(state: StartedGame): Card | null {
  return currentHeldCard(state)?.card ?? null;
}

function swapFailed(next: StartedGame): boolean {
  return next.lastMoveEvents.some(
    (event) => event.type === "cardsRevealed" && !event.matched,
  );
}

function outgoingFlights(
  previous: StartedGame,
  playerId: PlayerId,
  slotIndices: readonly number[],
  firstOrder: number,
): Flight[] {
  return slotIndices.map((slotIndex, index) => ({
    from: slotAnchor(playerId, slotIndex),
    to: discardPile,
    card: cardAt(previous, playerId, slotIndex),
    faceUpAtStart: false,
    faceUpAtEnd: true,
    order: firstOrder + index,
  }));
}

/**
 * Only the holder has seen the drawn card; everyone else watches it turn over.
 */
function discardHeldCard(
  previous: StartedGame,
  holderIsViewer: boolean,
): Flight {
  return {
    from: held,
    to: discardPile,
    card: heldCardOf(previous),
    faceUpAtStart: holderIsViewer,
    faceUpAtEnd: true,
    order: 0,
  };
}

function planSwap(
  previous: StartedGame,
  next: StartedGame,
  move: SwapDrawnCardMove | SwapDiscardCardMove,
  selfId: PlayerId,
): MovePlan {
  const fromDiscard = move.type === "swapDiscardCard";
  if (swapFailed(next)) {
    return fromDiscard
      ? noAnimation
      : movePlan([discardHeldCard(previous, move.playerId === selfId)], {
          discardTopWhileFlying: previous.discardPile[0] ?? null,
        });
  }
  const incoming: Flight = {
    from: fromDiscard ? discardPile : held,
    to: slotAnchor(move.playerId, Math.min(...move.slotIndices)),
    card: fromDiscard
      ? (previous.discardPile[0] ?? null)
      : heldCardOf(previous),
    faceUpAtStart: fromDiscard || move.playerId === selfId,
    faceUpAtEnd: false,
    order: 0,
  };
  return movePlan(
    [
      incoming,
      ...outgoingFlights(previous, move.playerId, move.slotIndices, 1),
    ],
    {
      discardTopWhileFlying: previous.discardPile[fromDiscard ? 1 : 0] ?? null,
    },
  );
}

function planCardAction(
  previous: StartedGame,
  holderIsViewer: boolean,
  peekedSlot: SlotRef | null,
): MovePlan {
  return movePlan([discardHeldCard(previous, holderIsViewer)], {
    peekedSlot,
    discardTopWhileFlying: previous.discardPile[0] ?? null,
  });
}

function planExchange(
  previous: StartedGame,
  move: ExchangeBlindMove,
  holderIsViewer: boolean,
): MovePlan {
  const own = slotAnchor(move.playerId, move.ownSlotIndex);
  const target = slotAnchor(move.targetPlayerId, move.targetSlotIndex);
  const hidden = {
    card: null,
    faceUpAtStart: false,
    faceUpAtEnd: false,
    order: 1,
  };
  return movePlan(
    [
      discardHeldCard(previous, holderIsViewer),
      { from: own, to: target, ...hidden },
      { from: target, to: own, ...hidden },
    ],
    { discardTopWhileFlying: previous.discardPile[0] ?? null },
  );
}

/**
 * Dealt round by round like at a real table, then the first discard is turned over.
 */
export function planDeal(dealt: StartedGame): MovePlan {
  const dealing = SLOT_INDICES.flatMap((slotIndex) =>
    dealt.seats.map((seat, seatIndex) => ({
      from: drawPile,
      to: slotAnchor(seat.player.id, slotIndex),
      card: null,
      faceUpAtStart: false,
      faceUpAtEnd: false,
      order: slotIndex * dealt.seats.length + seatIndex,
    })),
  );
  const firstDiscard: Flight = {
    from: drawPile,
    to: discardPile,
    card: dealt.discardPile[0] ?? null,
    faceUpAtStart: false,
    faceUpAtEnd: true,
    order: dealing.length,
  };
  return movePlan([...dealing, firstDiscard], {
    staggerMs: DEAL_STAGGER_MS,
    discardTopWhileFlying: null,
  });
}

export function planMove(
  previous: StartedGame,
  move: Move,
  next: StartedGame,
  selfId: PlayerId,
): MovePlan {
  const moverIsViewer = move.playerId === selfId;
  switch (move.type) {
    case "drawFromDeck":
      return movePlan([
        {
          from: drawPile,
          to: held,
          card: heldCardOf(next),
          faceUpAtStart: false,
          faceUpAtEnd: moverIsViewer,
          order: 0,
        },
      ]);
    case "discardDrawnCard":
      return planCardAction(previous, moverIsViewer, null);
    case "swapDrawnCard":
    case "swapDiscardCard":
      return planSwap(previous, next, move, selfId);
    case "viewOwnCard":
      return planCardAction(previous, moverIsViewer, {
        playerId: move.playerId,
        slotIndex: move.slotIndex,
      });
    case "viewOtherCard":
      return planCardAction(previous, moverIsViewer, {
        playerId: move.targetPlayerId,
        slotIndex: move.slotIndex,
      });
    case "exchangeBlind":
      return planExchange(previous, move, moverIsViewer);
    case "startGame":
      return planDeal(next);
    case "viewStartingCards":
    case "callEnd":
      return noAnimation;
  }
}
