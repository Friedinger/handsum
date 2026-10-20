import type {
  ExchangeBlindMove,
  ViewOtherCardMove,
  ViewOwnCardMove,
} from "@/engine/moves/types";
import { accept, reject, type Result } from "@/engine/outcome";
import {
  isSlotIndex,
  replaceAt,
  seatIndexOf,
  withLayout,
} from "@/engine/state";
import type {
  Card,
  CardAction,
  GameState,
  PlayerId,
  Slot,
  StartedGame,
} from "@/engine/types";
import {
  discardHeldCard,
  requireHeldCard,
  withEvent,
  type HeldCardTurn,
} from "@/engine/moves/turn";

interface TargetSeat {
  readonly playerId: PlayerId;
  readonly seatIndex: number;
  readonly layout: readonly Slot[];
}

function requireAction(
  state: GameState,
  playerId: PlayerId,
  action: CardAction,
): Result<HeldCardTurn> {
  const turn = requireHeldCard(state, playerId);
  if (!turn.ok) {
    return turn;
  }
  return turn.value.heldCard.action === action
    ? turn
    : reject("wrongCardAction");
}

function requireOtherSeat(
  turn: HeldCardTurn,
  targetPlayerId: PlayerId,
): Result<TargetSeat> {
  const seatIndex = seatIndexOf(turn.state, targetPlayerId);
  const seat = turn.state.seats[seatIndex];
  if (!seat || targetPlayerId === turn.playerId) {
    return reject("invalidTarget");
  }
  return accept({ playerId: targetPlayerId, seatIndex, layout: seat.layout });
}

function requireCardAt(
  layout: readonly Slot[],
  slotIndex: number,
): Result<Card> {
  if (!isSlotIndex(layout, slotIndex)) {
    return reject("invalidSlot");
  }
  const card = layout[slotIndex];
  return card ? accept(card) : reject("emptySlot");
}

function viewCard(
  turn: HeldCardTurn,
  ownerId: PlayerId,
  layout: readonly Slot[],
  slotIndex: number,
): Result<StartedGame> {
  const card = requireCardAt(layout, slotIndex);
  if (!card.ok) {
    return card;
  }
  const viewed = withEvent(turn.state, {
    type: "cardViewed",
    viewerId: turn.playerId,
    ownerId,
    slotIndex,
    card: card.value,
  });
  return accept(discardHeldCard(turn, viewed));
}

export function applyViewOwnCard(
  state: GameState,
  move: ViewOwnCardMove,
): Result<StartedGame> {
  const turn = requireAction(state, move.playerId, "viewOwn");
  if (!turn.ok) {
    return turn;
  }
  return viewCard(turn.value, move.playerId, turn.value.layout, move.slotIndex);
}

export function applyViewOtherCard(
  state: GameState,
  move: ViewOtherCardMove,
): Result<StartedGame> {
  const turn = requireAction(state, move.playerId, "viewOther");
  if (!turn.ok) {
    return turn;
  }
  const target = requireOtherSeat(turn.value, move.targetPlayerId);
  if (!target.ok) {
    return target;
  }
  return viewCard(
    turn.value,
    move.targetPlayerId,
    target.value.layout,
    move.slotIndex,
  );
}

export function applyExchangeBlind(
  state: GameState,
  move: ExchangeBlindMove,
): Result<StartedGame> {
  const turn = requireAction(state, move.playerId, "exchangeBlind");
  if (!turn.ok) {
    return turn;
  }
  const target = requireOtherSeat(turn.value, move.targetPlayerId);
  if (!target.ok) {
    return target;
  }
  const ownCard = requireCardAt(turn.value.layout, move.ownSlotIndex);
  if (!ownCard.ok) {
    return ownCard;
  }
  const targetCard = requireCardAt(target.value.layout, move.targetSlotIndex);
  if (!targetCard.ok) {
    return targetCard;
  }
  const ownLayout = replaceAt(
    turn.value.layout,
    move.ownSlotIndex,
    targetCard.value,
  );
  const targetLayout = replaceAt(
    target.value.layout,
    move.targetSlotIndex,
    ownCard.value,
  );
  const seats = withLayout(
    withLayout(turn.value.state.seats, turn.value.seatIndex, ownLayout),
    target.value.seatIndex,
    targetLayout,
  );
  return accept(discardHeldCard(turn.value, { ...turn.value.state, seats }));
}
