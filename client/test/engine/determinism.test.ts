import { describe, expect, it } from "vitest";
import { applyMove, replayMoves } from "@/engine/applyMove";
import { standardDeck } from "@/engine/deck";
import { legalMoves } from "@/engine/legalMoves";
import type { Move } from "@/engine/moves/types";
import { createMulberry32 } from "@/engine/random";
import {
  allCards,
  expectStarted,
  startingViewMoves,
  startedGame,
  startGameMove,
} from "@test/support/gameFixtures";
import type { StartedGame } from "@/engine/types";

const MOVES_BEFORE_CALLING_END = 120;

function chooseMove(
  options: readonly Move[],
  random: () => number,
  moveNumber: number,
): Move {
  const callEnd = options.find((move) => move.type === "callEnd");
  if (callEnd && moveNumber >= MOVES_BEFORE_CALLING_END) {
    return callEnd;
  }
  const regularOptions = options.filter((move) => move.type !== "callEnd");
  const pool = regularOptions.length > 0 ? regularOptions : options;
  const chosen = pool[Math.floor(random() * pool.length)];
  if (!chosen) {
    throw new Error("No legal move available");
  }
  return chosen;
}

function randomPlayout(playerCount: number, seed: number): Move[] {
  const moves: Move[] = [
    startGameMove(playerCount, seed),
    ...startingViewMoves(startedGame(playerCount, seed)),
  ];
  const random = createMulberry32(seed);
  let state = expectStarted(replayMoves(moves));
  while (state.phase.kind === "playing") {
    const options = legalMoves(state, state.phase.currentPlayerId);
    const chosen = chooseMove(options, random, moves.length);
    moves.push(chosen);
    state = expectStarted(applyMove(state, chosen));
  }
  return moves;
}

function replayStarted(moves: readonly Move[]): StartedGame {
  return expectStarted(replayMoves(moves));
}

describe("determinism", () => {
  it.each([
    [2, 1],
    [4, 77],
    [8, 2024],
  ])(
    "plays %i players with seed %i to the end and replays identically",
    (playerCount, seed) => {
      const moves = randomPlayout(playerCount, seed);
      const finalState = replayStarted(moves);
      expect(finalState.phase.kind).toBe("finished");
      expect(finalState).toEqual(replayStarted(moves));
    },
  );

  it("keeps all 52 cards in play after every move", () => {
    const moves = randomPlayout(5, 9);
    for (let length = 1; length <= moves.length; length++) {
      const ids = allCards(replayStarted(moves.slice(0, length))).map(
        (card) => card.id,
      );
      expect(ids.sort((a, b) => a - b)).toEqual(
        standardDeck.map((card) => card.id),
      );
    }
  });

  it("never mutates a previous state", () => {
    const moves = randomPlayout(3, 5);
    for (let length = 1; length < moves.length; length++) {
      const before = replayStarted(moves.slice(0, length));
      const snapshot = structuredClone(before);
      const nextMove = moves[length];
      if (nextMove) {
        applyMove(before, nextMove);
      }
      expect(before).toEqual(snapshot);
    }
  });

  it("counts every applied move", () => {
    const moves = randomPlayout(3, 5);
    expect(replayStarted(moves).moveCount).toBe(moves.length);
  });
});
