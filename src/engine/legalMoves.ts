import { tryApplyMove } from "./applyMove";
import type { Move } from "./moves";
import { LAYOUT_SIZE } from "./rules";
import type { GameState, PlayerId } from "./types";

const SLOT_INDICES = Array.from({ length: LAYOUT_SIZE }, (_, slotIndex) => slotIndex);

// startGame is never listed: its player list and seed come from the lobby, not from the rules.
function candidateMoves(playerId: PlayerId): Move[] {
  return [
    { type: "ready", playerId },
    { type: "drawFromDeck", playerId },
    { type: "discardDrawnCard", playerId },
    ...SLOT_INDICES.map((slotIndex): Move => ({ type: "swapDrawnCard", playerId, slotIndex })),
    ...SLOT_INDICES.map((slotIndex): Move => ({ type: "swapDiscardCard", playerId, slotIndex })),
  ];
}

export function legalMoves(state: GameState, playerId: PlayerId): Move[] {
  return candidateMoves(playerId).filter((move) => tryApplyMove(state, move).ok);
}
