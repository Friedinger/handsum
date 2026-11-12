import { describe, expect, it } from "vitest";

import type { Move, StartedGame } from "@/engine";
import { BOT_KEEP_MAX, nextBotMove } from "@/utils/bot";

import {
  holding,
  makeCard,
  playingGame,
  startedGame,
  startGameMove,
} from "@test/support/gameFixtures";

const BOT = "player-1";

function kept(slot: number): Move {
  return { type: "swapDrawnCard", playerId: BOT, slotIndices: [slot] };
}

function roundWith(...moves: Move[]): Move[] {
  return [startGameMove(), ...moves];
}

describe("nextBotMove", () => {
  it("looks at its two left cards once at the start", () => {
    const state = startedGame();
    const afterViewing: StartedGame = {
      ...state,
      phase: { kind: "startingView", viewedPlayerIds: [BOT] },
    };

    expect(nextBotMove(state, [], BOT, "never")).toEqual({
      type: "viewStartingCards",
      playerId: BOT,
      slotIndices: [0, 1],
    });
    expect(nextBotMove(afterViewing, [], BOT, "never")).toBeNull();
  });

  it("waits while it is someone else's turn", () => {
    expect(nextBotMove(playingGame(), [], "player-2", "now")).toBeNull();
  });

  it("draws at the start of its turn", () => {
    expect(nextBotMove(playingGame(), roundWith(), BOT, "never")).toEqual({
      type: "drawFromDeck",
      playerId: BOT,
    });
  });

  it("keeps low cards on the cards it has not seen yet", () => {
    const state = holding(playingGame(), makeCard(BOT_KEEP_MAX));

    expect(nextBotMove(state, roundWith(), BOT, "never")).toEqual(kept(2));
    expect(nextBotMove(state, roundWith(kept(2)), BOT, "never")).toEqual(
      kept(3),
    );
  });

  it("throws away high cards and low ones once it knows all its cards", () => {
    const discard = { type: "discardDrawnCard", playerId: BOT };
    const high = holding(playingGame(), makeCard(BOT_KEEP_MAX + 1));
    const low = holding(playingGame(), makeCard(1));

    expect(nextBotMove(high, roundWith(), BOT, "never")).toEqual(discard);
    expect(nextBotMove(low, roundWith(kept(2), kept(3)), BOT, "never")).toEqual(
      discard,
    );
  });

  it("only counts the cards it kept in the current round", () => {
    const state = holding(playingGame(), makeCard(1));
    const moves = [...roundWith(kept(2), kept(3)), ...roundWith()];

    expect(nextBotMove(state, moves, BOT, "never")).toEqual(kept(2));
  });

  it("announces the end when asked to or once it knows all its cards", () => {
    const state = playingGame();
    const callEnd = { type: "callEnd", playerId: BOT };
    const allKnown = roundWith(kept(2), kept(3));

    expect(nextBotMove(state, roundWith(), BOT, "now")).toEqual(callEnd);
    expect(nextBotMove(state, allKnown, BOT, "whenAllKnown")).toEqual(callEnd);
    expect(nextBotMove(state, roundWith(kept(2)), BOT, "whenAllKnown")).toEqual(
      { type: "drawFromDeck", playerId: BOT },
    );
    expect(nextBotMove(state, allKnown, BOT, "never")).toEqual({
      type: "drawFromDeck",
      playerId: BOT,
    });
  });

  it("keeps drawing once someone else has announced the end", () => {
    const state: StartedGame = { ...playingGame(), endCallerId: "player-2" };

    expect(nextBotMove(state, roundWith(), BOT, "now")).toEqual({
      type: "drawFromDeck",
      playerId: BOT,
    });
  });
});
