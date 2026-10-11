import type { Card, Move, PlayerId, StartedGame } from "../engine";
import type { SlotRef } from "./tableInteraction";

export type Anchor =
  | { readonly kind: "drawPile" }
  | { readonly kind: "discardPile" }
  | { readonly kind: "held" }
  | { readonly kind: "slot"; readonly slot: SlotRef };

export interface Flight {
  readonly from: Anchor;
  readonly to: Anchor;
  readonly card: Card | null;
  readonly faceUp: boolean;
  readonly order: number;
}

export interface MovePlan {
  readonly flights: readonly Flight[];
  readonly peekedSlot: SlotRef | null;
  // What the discard pile shows until the cards flying onto it have landed.
  readonly discardTopWhileFlying: Card | null | undefined;
}

const drawPile: Anchor = { kind: "drawPile" };
const discardPile: Anchor = { kind: "discardPile" };
const held: Anchor = { kind: "held" };

const noAnimation: MovePlan = { flights: [], peekedSlot: null, discardTopWhileFlying: undefined };

export function anchorKey(anchor: Anchor): string {
  return anchor.kind === "slot"
    ? `slot:${anchor.slot.playerId}:${String(anchor.slot.slotIndex)}`
    : anchor.kind;
}

function slotAnchor(playerId: PlayerId, slotIndex: number): Anchor {
  return { kind: "slot", slot: { playerId, slotIndex } };
}

function cardAt(state: StartedGame, playerId: PlayerId, slotIndex: number): Card | null {
  return state.seats.find((seat) => seat.player.id === playerId)?.layout[slotIndex] ?? null;
}

function heldCardOf(state: StartedGame): Card | null {
  const { phase } = state;
  return phase.kind === "playing" && phase.step.kind === "holdingDrawnCard"
    ? phase.step.card
    : null;
}

function swapFailed(next: StartedGame): boolean {
  return next.lastMoveEvents.some((event) => event.type === "cardsRevealed" && !event.matched);
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
    faceUp: true,
    order: firstOrder + index,
  }));
}

function discardHeldCard(previous: StartedGame): Flight {
  return { from: held, to: discardPile, card: heldCardOf(previous), faceUp: true, order: 0 };
}

function planSwap(
  previous: StartedGame,
  next: StartedGame,
  move: Move & { type: "swapDrawnCard" | "swapDiscardCard" },
  selfId: PlayerId,
): MovePlan {
  const fromDiscard = move.type === "swapDiscardCard";
  if (swapFailed(next)) {
    return fromDiscard
      ? noAnimation
      : {
          flights: [discardHeldCard(previous)],
          peekedSlot: null,
          discardTopWhileFlying: previous.discardPile[0] ?? null,
        };
  }
  const incoming: Flight = {
    from: fromDiscard ? discardPile : held,
    to: slotAnchor(move.playerId, Math.min(...move.slotIndices)),
    card: fromDiscard ? (previous.discardPile[0] ?? null) : heldCardOf(previous),
    faceUp: fromDiscard || move.playerId === selfId,
    order: 0,
  };
  return {
    flights: [incoming, ...outgoingFlights(previous, move.playerId, move.slotIndices, 1)],
    peekedSlot: null,
    discardTopWhileFlying: previous.discardPile[fromDiscard ? 1 : 0] ?? null,
  };
}

function planCardAction(previous: StartedGame, peekedSlot: SlotRef | null): MovePlan {
  return {
    flights: [discardHeldCard(previous)],
    peekedSlot,
    discardTopWhileFlying: previous.discardPile[0] ?? null,
  };
}

function planExchange(previous: StartedGame, move: Move & { type: "exchangeBlind" }): MovePlan {
  const own = slotAnchor(move.playerId, move.ownSlotIndex);
  const target = slotAnchor(move.targetPlayerId, move.targetSlotIndex);
  return {
    flights: [
      discardHeldCard(previous),
      { from: own, to: target, card: null, faceUp: false, order: 1 },
      { from: target, to: own, card: null, faceUp: false, order: 1 },
    ],
    peekedSlot: null,
    discardTopWhileFlying: previous.discardPile[0] ?? null,
  };
}

export function planMove(
  previous: StartedGame,
  move: Move,
  next: StartedGame,
  selfId: PlayerId,
): MovePlan {
  switch (move.type) {
    case "drawFromDeck":
      return {
        flights: [{ from: drawPile, to: held, card: null, faceUp: false, order: 0 }],
        peekedSlot: null,
        discardTopWhileFlying: undefined,
      };
    case "discardDrawnCard":
      return planCardAction(previous, null);
    case "swapDrawnCard":
    case "swapDiscardCard":
      return planSwap(previous, next, move, selfId);
    case "viewOwnCard":
      return planCardAction(previous, { playerId: move.playerId, slotIndex: move.slotIndex });
    case "viewOtherCard":
      return planCardAction(previous, {
        playerId: move.targetPlayerId,
        slotIndex: move.slotIndex,
      });
    case "exchangeBlind":
      return planExchange(previous, move);
    case "startGame":
    case "viewStartingCards":
    case "callEnd":
      return noAnimation;
  }
}
