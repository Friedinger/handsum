import { describe, expect, it } from "vitest";
import { applyMove, replayMoves } from "./applyMove";
import { standardDeck } from "./deck";
import { legalMoves } from "./legalMoves";
import type { Move } from "./moves";
import { createMulberry32 } from "./random";
import { allCards, expectStarted, readyMoves, startedGame, startGameMove } from "./testFixtures";
import type { GameState } from "./types";

const PLAYOUT_MOVES = 30;

function activePlayerId(state: GameState): string {
  const started = expectStarted(state);
  if (started.phase.kind !== "playing") {
    throw new Error("Expected the playing phase");
  }
  return started.phase.currentPlayerId;
}

function randomPlayout(playerCount: number, seed: number): Move[] {
  const start = startGameMove(playerCount, seed);
  const moves: Move[] = [start, ...readyMoves(startedGame(playerCount, seed))];
  const chooser = createMulberry32(seed);
  let state = replayMoves(moves);
  for (let step = 0; step < PLAYOUT_MOVES; step++) {
    const options = legalMoves(state, activePlayerId(state));
    const chosen = options[Math.floor(chooser() * options.length)];
    if (!chosen) {
      break;
    }
    moves.push(chosen);
    state = applyMove(state, chosen);
  }
  return moves;
}

describe("determinism", () => {
  it.each([
    [2, 1],
    [4, 77],
    [8, 2024],
  ])("replays %i players with seed %i to the identical state", (playerCount, seed) => {
    const moves = randomPlayout(playerCount, seed);
    expect(moves.length).toBeGreaterThan(PLAYOUT_MOVES);
    expect(replayMoves(moves)).toEqual(replayMoves(moves));
  });

  it("keeps all 52 cards in play after every move", () => {
    const moves = randomPlayout(5, 9);
    for (let length = 1; length <= moves.length; length++) {
      const ids = allCards(expectStarted(replayMoves(moves.slice(0, length)))).map(
        (card) => card.id,
      );
      expect(ids.sort((a, b) => a - b)).toEqual(standardDeck.map((card) => card.id));
    }
  });

  it("never mutates a previous state", () => {
    const moves = randomPlayout(3, 5);
    const before = replayMoves(moves.slice(0, -1));
    const snapshot = structuredClone(before);
    const lastMove = moves.at(-1);
    if (!lastMove) {
      throw new Error("Expected moves");
    }
    applyMove(before, lastMove);
    expect(before).toEqual(snapshot);
  });

  it("counts every applied move", () => {
    const moves = randomPlayout(3, 5);
    expect(expectStarted(replayMoves(moves)).moveCount).toBe(moves.length);
  });
});
