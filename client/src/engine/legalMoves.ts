import { tryApplyMove } from "./applyMove";
import type { Move } from "@/engine/moves/types";
import { SLOT_INDICES, STARTING_VIEW_CARD_COUNT } from "./rules";
import type { GameState, PlayerId } from "./types";

function nonEmptySubsets(items: readonly number[]): number[][] {
  return items.reduce<number[][]>(
    (subsets, item) => [
      ...subsets,
      [item],
      ...subsets.map((subset) => [...subset, item]),
    ],
    [],
  );
}

const SLOT_SELECTIONS = nonEmptySubsets(SLOT_INDICES).sort(
  (a, b) => a.length - b.length,
);
const STARTING_VIEW_SELECTIONS = SLOT_SELECTIONS.filter(
  (selection) => selection.length === STARTING_VIEW_CARD_COUNT,
);

function otherPlayerIds(state: GameState, playerId: PlayerId): PlayerId[] {
  if (state.status !== "started") {
    return [];
  }
  return state.seats
    .map((seat) => seat.player.id)
    .filter((id) => id !== playerId);
}

function cardActionCandidates(state: GameState, playerId: PlayerId): Move[] {
  const targets = otherPlayerIds(state, playerId);
  return [
    ...SLOT_INDICES.map((slotIndex): Move => ({
      type: "viewOwnCard",
      playerId,
      slotIndex,
    })),
    ...targets.flatMap((targetPlayerId) =>
      SLOT_INDICES.map((slotIndex): Move => ({
        type: "viewOtherCard",
        playerId,
        targetPlayerId,
        slotIndex,
      })),
    ),
    ...SLOT_INDICES.flatMap((ownSlotIndex) =>
      targets.flatMap((targetPlayerId) =>
        SLOT_INDICES.map((targetSlotIndex): Move => ({
          type: "exchangeBlind",
          playerId,
          ownSlotIndex,
          targetPlayerId,
          targetSlotIndex,
        })),
      ),
    ),
  ];
}

// startGame is never listed: its player list and seed come from the lobby, not from the rules.
function candidateMoves(state: GameState, playerId: PlayerId): Move[] {
  return [
    ...STARTING_VIEW_SELECTIONS.map((slotIndices): Move => ({
      type: "viewStartingCards",
      playerId,
      slotIndices,
    })),
    { type: "drawFromDeck", playerId },
    { type: "callEnd", playerId },
    ...SLOT_SELECTIONS.map((slotIndices): Move => ({
      type: "swapDiscardCard",
      playerId,
      slotIndices,
    })),
    { type: "discardDrawnCard", playerId },
    ...SLOT_SELECTIONS.map((slotIndices): Move => ({
      type: "swapDrawnCard",
      playerId,
      slotIndices,
    })),
    ...cardActionCandidates(state, playerId),
  ];
}

export function legalMoves(state: GameState, playerId: PlayerId): Move[] {
  return candidateMoves(state, playerId).filter(
    (move) => tryApplyMove(state, move).ok,
  );
}
