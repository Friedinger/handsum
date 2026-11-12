import {
  type Move,
  type PlayerId,
  type StartedGame,
  tryApplyMove,
} from "@/engine";

export const BOT_KEEP_MAX = 4;

const STARTING_VIEW_SLOTS: readonly number[] = [0, 1];
const UNSEEN_SLOTS: readonly number[] = [2, 3];

/** When a bot announces the end: never, once it has seen all its cards, or at its next chance. */
export type BotEndCall = "never" | "whenAllKnown" | "now";

function movesOfCurrentRound(moves: readonly Move[]): readonly Move[] {
  const lastStart = moves.findLastIndex((move) => move.type === "startGame");
  return moves.slice(lastStart + 1);
}

function keptCardCount(moves: readonly Move[], playerId: PlayerId): number {
  return movesOfCurrentRound(moves).filter(
    (move) => move.playerId === playerId && move.type === "swapDrawnCard",
  ).length;
}

function wantsToCallEnd(
  state: StartedGame,
  moves: readonly Move[],
  playerId: PlayerId,
  endCall: BotEndCall,
): boolean {
  const ready =
    endCall === "now" ||
    (endCall === "whenAllKnown" &&
      keptCardCount(moves, playerId) >= UNSEEN_SLOTS.length);
  return ready && tryApplyMove(state, { type: "callEnd", playerId }).ok;
}

/**
 * A bot keeps a drawn card of up to 4 by swapping it onto the next card it has never seen and
 * throws away everything higher. It never uses card powers.
 */
function keepOrDiscard(
  moves: readonly Move[],
  playerId: PlayerId,
  heldValue: number,
): Move {
  const unseenSlot = UNSEEN_SLOTS[keptCardCount(moves, playerId)];
  return heldValue <= BOT_KEEP_MAX && unseenSlot !== undefined
    ? { type: "swapDrawnCard", playerId, slotIndices: [unseenSlot] }
    : { type: "discardDrawnCard", playerId };
}

export function nextBotMove(
  state: StartedGame,
  moves: readonly Move[],
  playerId: PlayerId,
  endCall: BotEndCall,
): Move | null {
  const { phase } = state;
  if (phase.kind === "startingView") {
    return phase.viewedPlayerIds.includes(playerId)
      ? null
      : {
          type: "viewStartingCards",
          playerId,
          slotIndices: STARTING_VIEW_SLOTS,
        };
  }
  if (phase.kind !== "playing" || phase.currentPlayerId !== playerId) {
    return null;
  }
  if (phase.step.kind === "holdingDrawnCard") {
    return keepOrDiscard(moves, playerId, phase.step.card.value);
  }
  return wantsToCallEnd(state, moves, playerId, endCall)
    ? { type: "callEnd", playerId }
    : { type: "drawFromDeck", playerId };
}
