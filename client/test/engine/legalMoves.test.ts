import { describe, expect, it } from "vitest";

import { applyMove, tryApplyMove } from "@/engine/applyMove";
import { legalMoves } from "@/engine/legalMoves";
import type { Move, MoveType } from "@/engine/moves/types";
import { createMulberry32 } from "@/engine/random";
import { LAYOUT_SIZE } from "@/engine/rules";
import type { PlayerId, StartedGame } from "@/engine/types";

import { expectStarted, startedGame } from "@test/support/gameFixtures";

const UNKNOWN_PLAYER_ID = "nobody";
const PROBED_SLOT_INDICES = Array.from(
  { length: LAYOUT_SIZE + 2 },
  (_, index) => index - 1,
);
const MAX_PLAYOUT_MOVES = 200;
const END_CALL_MOVE_INDEX = 150;
/** An array replacer fixes the key order, so the order fields are written in does not matter. */
const MOVE_KEY_FIELDS = [
  "type",
  "playerId",
  "slotIndex",
  "slotIndices",
  "ownSlotIndex",
  "targetPlayerId",
  "targetSlotIndex",
];

/** Kept apart from the engine's own subset helper so the oracle shares no code with what it checks. */
function subsets(items: readonly number[]): number[][] {
  return items.reduce<number[][]>(
    (all, item) => [...all, ...all.map((subset) => [...subset, item])],
    [[]],
  );
}

const PROBED_SELECTIONS = subsets(PROBED_SLOT_INDICES).flatMap((subset) =>
  subset.length > 1 ? [subset, [...subset].reverse()] : [subset],
);

/** Every move the engine could possibly accept, including invalid indices and players. */
function probedMoves(state: StartedGame, playerId: PlayerId): Move[] {
  const targets = [
    ...state.seats.map((seat) => seat.player.id),
    UNKNOWN_PLAYER_ID,
  ];
  return [
    { type: "drawFromDeck", playerId },
    { type: "discardDrawnCard", playerId },
    { type: "callEnd", playerId },
    ...PROBED_SELECTIONS.flatMap((slotIndices): Move[] => [
      { type: "viewStartingCards", playerId, slotIndices },
      { type: "swapDrawnCard", playerId, slotIndices },
      { type: "swapDiscardCard", playerId, slotIndices },
    ]),
    ...PROBED_SLOT_INDICES.flatMap((slotIndex): Move[] => [
      { type: "viewOwnCard", playerId, slotIndex },
      ...targets.map((targetPlayerId): Move => ({
        type: "viewOtherCard",
        playerId,
        targetPlayerId,
        slotIndex,
      })),
      ...PROBED_SLOT_INDICES.flatMap((targetSlotIndex) =>
        targets.map((targetPlayerId): Move => ({
          type: "exchangeBlind",
          playerId,
          ownSlotIndex: slotIndex,
          targetPlayerId,
          targetSlotIndex,
        })),
      ),
    ]),
  ];
}

/** Slot selections in another order are the same move. */
function moveKey(move: Move): string {
  if ("slotIndices" in move) {
    const sorted = [...move.slotIndices].sort((a, b) => a - b);
    return JSON.stringify({ ...move, slotIndices: sorted }, MOVE_KEY_FIELDS);
  }
  return JSON.stringify(move, MOVE_KEY_FIELDS);
}

function acceptedKeys(state: StartedGame, playerId: PlayerId): string[] {
  const accepted = probedMoves(state, playerId).filter(
    (move) => tryApplyMove(state, move).ok,
  );
  return [...new Set(accepted.map(moveKey))].sort();
}

function actingPlayerId(state: StartedGame): PlayerId | null {
  if (state.phase.kind === "playing") {
    return state.phase.currentPlayerId;
  }
  if (state.phase.kind === "startingView") {
    const viewed = state.phase.viewedPlayerIds;
    const waiting = state.seats.find(
      (seat) => !viewed.includes(seat.player.id),
    );
    return waiting?.player.id ?? null;
  }
  return null;
}

/**
 * The states a seeded random game passes through, so every phase and card power comes up.
 * The end is called late so the playout first covers enough turns, then runs through the last round.
 */
function playoutStates(playerCount: number, seed: number): StartedGame[] {
  const random = createMulberry32(seed);
  const states = [startedGame(playerCount, seed)];
  for (let step = 0; step < MAX_PLAYOUT_MOVES; step++) {
    const state = states[states.length - 1];
    const playerId = state && actingPlayerId(state);
    if (!state || !playerId) {
      break;
    }
    const options = legalMoves(state, playerId);
    const endCall = options.find((move) => move.type === "callEnd");
    const otherOptions = options.filter((move) => move.type !== "callEnd");
    const chosen =
      step >= END_CALL_MOVE_INDEX && endCall
        ? endCall
        : otherOptions[Math.floor(random() * otherOptions.length)];
    if (!chosen) {
      break;
    }
    states.push(expectStarted(applyMove(state, chosen)));
  }
  return states;
}

const LISTED_MOVE_TYPES: readonly MoveType[] = [
  "viewStartingCards",
  "drawFromDeck",
  "discardDrawnCard",
  "swapDrawnCard",
  "swapDiscardCard",
  "viewOwnCard",
  "viewOtherCard",
  "exchangeBlind",
  "callEnd",
];

describe("legalMoves", () => {
  it.each([
    [2, 3],
    [4, 11],
  ])(
    "lists exactly the moves the engine accepts (%i players, seed %i)",
    (playerCount, seed) => {
      const listedTypes = new Set<MoveType>();
      const states = playoutStates(playerCount, seed);
      for (const [step, state] of states.entries()) {
        for (const seat of state.seats) {
          const context = `step ${String(step)}, ${seat.player.id}, ${state.phase.kind}`;
          const moves = legalMoves(state, seat.player.id);
          const listed = [...new Set(moves.map(moveKey))].sort();
          expect(moves, context).toHaveLength(listed.length);
          expect(listed, context).toEqual(acceptedKeys(state, seat.player.id));
          for (const move of moves) {
            listedTypes.add(move.type);
          }
        }
      }
      expect(states.at(-1)?.phase.kind).toBe("finished");
      expect([...listedTypes].sort()).toEqual([...LISTED_MOVE_TYPES].sort());
    },
  );

  it("lists nothing for a player who is not at the table", () => {
    expect(legalMoves(startedGame(2), UNKNOWN_PLAYER_ID)).toEqual([]);
  });
});
