import { strings } from "@/data/strings";
import {
  type Card,
  findSeat,
  type MoveRejection,
  type PlayerId,
  type Seat,
  type StartedGame,
  tryApplyMove,
} from "@/engine";
import {
  anchorKey,
  type DiscardTopOverride,
  HELD_ANCHOR,
} from "@/utils/cardFlights";
import { heldCardLabel, shownHeldCard } from "@/utils/heldCard";
import { isRevealed, type Reveal } from "@/utils/reveals";
import type { SlotView } from "@/utils/slotView";
import { hintFor } from "@/utils/tableHints";
import {
  type ClickTarget,
  type Intent,
  isSlotMarked,
  selectedOwnSlots,
  type Situation,
} from "@/utils/tableIntent";

export interface TableViewContext {
  readonly state: StartedGame;
  readonly selfId: PlayerId;
  readonly intent: Intent;
  readonly situation: Situation;
  readonly reveals: readonly Reveal[];
  readonly onlineIds: ReadonlySet<PlayerId>;
  readonly isClickable: (target: ClickTarget) => boolean;
  readonly isHighlighted: (target: ClickTarget) => boolean;
  readonly hasGivenHighlight: boolean;
  readonly hiddenAnchors: ReadonlySet<string>;
  readonly peekedAnchor: string | null;
  readonly discardTopWhileFlying: DiscardTopOverride;
}

export interface SeatView {
  readonly name: string;
  readonly badges: readonly string[];
  readonly slots: readonly SlotView[];
  readonly active: boolean;
}

export interface HandView {
  readonly seat: SeatView | null;
  readonly message: string;
  readonly messageActive: boolean;
  readonly messageIsError: boolean;
  readonly canCallEnd: boolean;
}

export interface CenterView {
  readonly drawPileCount: number;
  readonly discardTop: Card | null;
  readonly heldCard: Card | null;
  readonly heldLabel: string | null;
  readonly heldFaceUp: boolean;
  readonly drawClickable: boolean;
  readonly discardClickable: boolean;
  readonly heldClickable: boolean;
  readonly heldMarked: boolean;
  readonly discardReady: boolean;
  readonly drawHighlighted: boolean;
  readonly heldHighlighted: boolean;
  readonly heldInFlight: boolean;
  readonly heldIsTakenDiscard: boolean;
}

function isFinished(state: StartedGame): boolean {
  return state.phase.kind === "finished";
}

function currentPlayerId(state: StartedGame): PlayerId | null {
  return state.phase.kind === "playing" ? state.phase.currentPlayerId : null;
}

function isTakingDiscard(intent: Intent): boolean {
  return intent.kind === "takingDiscard";
}

export function slotViews(seat: Seat, context: TableViewContext): SlotView[] {
  return seat.layout.flatMap((card, slotIndex) => {
    if (!card) {
      return [];
    }
    const slot = { playerId: seat.player.id, slotIndex };
    const target = { kind: "slot", slot } as const;
    const anchor = anchorKey(target);
    return [
      {
        slotIndex,
        card,
        faceUp:
          isFinished(context.state) ||
          isRevealed(context.reveals, context.state, seat.player.id, slotIndex),
        clickable: context.isClickable(target),
        marked: isSlotMarked(context.intent, slot, context.selfId),
        highlighted: context.isHighlighted(target),
        anchor,
        inFlight: context.hiddenAnchors.has(anchor),
        peeked: context.peekedAnchor === anchor,
      },
    ];
  });
}

function seatBadges(seat: Seat, context: TableViewContext): string[] {
  return [
    context.onlineIds.has(seat.player.id) ? null : strings.table.offline,
    context.state.endCallerId === seat.player.id
      ? strings.table.calledEnd
      : null,
  ].filter((badge) => badge !== null);
}

export function seatView(seat: Seat, context: TableViewContext): SeatView {
  const isOwn = seat.player.id === context.selfId;
  return {
    name: isOwn
      ? `${seat.player.name} (${strings.table.you})`
      : seat.player.name,
    badges: seatBadges(seat, context),
    slots: slotViews(seat, context),
    active: seat.player.id === currentPlayerId(context.state),
  };
}

function discardTop(context: TableViewContext): Card | null {
  if (context.discardTopWhileFlying !== undefined) {
    return context.discardTopWhileFlying;
  }
  const below = isTakingDiscard(context.intent) ? 1 : 0;
  return context.state.discardPile[below] ?? null;
}

/** A given highlight is the only pulse on the discard pile, so it never doubles the swap confirmation. */
function isDiscardReady(context: TableViewContext): boolean {
  if (context.hasGivenHighlight) {
    return context.isHighlighted({ kind: "discardPile" });
  }
  return (
    selectedOwnSlots(context.intent).length > 0 &&
    (context.situation.kind === "holding" || isTakingDiscard(context.intent))
  );
}

export function centerView(context: TableViewContext): CenterView {
  const { state, selfId, intent } = context;
  const takingDiscard = isTakingDiscard(intent);
  const held = shownHeldCard(state, selfId, takingDiscard);
  return {
    drawPileCount: state.drawPile.length,
    discardTop: discardTop(context),
    heldCard: held?.card ?? null,
    heldLabel: heldCardLabel(state, selfId, held, takingDiscard),
    heldFaceUp: held?.holderId === selfId,
    drawClickable: context.isClickable({ kind: "drawPile" }),
    discardClickable: context.isClickable({ kind: "discardPile" }),
    heldClickable: context.isClickable({ kind: "heldCard" }),
    heldMarked: intent.kind === "action",
    discardReady: isDiscardReady(context),
    drawHighlighted: context.isHighlighted({ kind: "drawPile" }),
    heldHighlighted: context.isHighlighted({ kind: "heldCard" }),
    heldInFlight: context.hiddenAnchors.has(HELD_ANCHOR),
    heldIsTakenDiscard: takingDiscard,
  };
}

function handMessage(
  context: TableViewContext,
  rejection: MoveRejection | null,
): string {
  if (rejection) {
    return strings.rejectionMessages[rejection];
  }
  const showRememberNotice = context.reveals.some(
    (reveal) => reveal.reason === "startingView",
  );
  return showRememberNotice
    ? strings.hints.rememberCards
    : hintFor(context.state, context.selfId, context.intent);
}

function canCallEnd({ state, selfId, situation, intent }: TableViewContext) {
  return (
    situation.kind === "choosing" &&
    intent.kind === "none" &&
    tryApplyMove(state, { type: "callEnd", playerId: selfId }).ok
  );
}

export function handView(
  context: TableViewContext,
  rejection: MoveRejection | null,
): HandView {
  const seat = findSeat(context.state, context.selfId);
  return {
    seat: seat ? seatView(seat, context) : null,
    message: handMessage(context, rejection),
    messageActive: context.situation.kind !== "waiting",
    messageIsError: rejection !== null,
    canCallEnd: canCallEnd(context),
  };
}
