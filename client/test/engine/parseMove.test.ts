import { describe, expect, it } from "vitest";

import type { Move } from "@/engine/moves/types";
import { parseMove } from "@/engine/parseMove";

import { startGameMove } from "@test/support/gameFixtures";

const validMoves: Move[] = [
  startGameMove(),
  { type: "viewStartingCards", playerId: "a", slotIndices: [0, 1] },
  { type: "drawFromDeck", playerId: "a" },
  { type: "discardDrawnCard", playerId: "a" },
  { type: "callEnd", playerId: "a" },
  { type: "swapDrawnCard", playerId: "a", slotIndices: [0, 2] },
  { type: "swapDiscardCard", playerId: "a", slotIndices: [1] },
  { type: "viewOwnCard", playerId: "a", slotIndex: 3 },
  { type: "viewOtherCard", playerId: "a", targetPlayerId: "b", slotIndex: 0 },
  {
    type: "exchangeBlind",
    playerId: "a",
    ownSlotIndex: 1,
    targetPlayerId: "b",
    targetSlotIndex: 2,
  },
];

describe("parseMove", () => {
  it.each(validMoves)("round-trips a $type move through JSON", (move) => {
    expect(parseMove(JSON.parse(JSON.stringify(move)))).toEqual(move);
  });

  it("drops unknown extra fields", () => {
    expect(parseMove({ type: "callEnd", playerId: "a", sneaky: true })).toEqual(
      {
        type: "callEnd",
        playerId: "a",
      },
    );
  });

  it.each([
    null,
    "callEnd",
    [],
    { type: "fly", playerId: "a" },
    { type: "callEnd" },
    { type: "swapDrawnCard", playerId: "a" },
    { type: "swapDrawnCard", playerId: "a", slotIndices: ["0"] },
    { type: "viewOtherCard", playerId: "a", slotIndex: 0 },
    { type: "startGame", playerId: "a", players: [{ id: 1 }], seed: 1 },
  ])("rejects malformed input %j", (value) => {
    expect(parseMove(value)).toBeNull();
  });
});
