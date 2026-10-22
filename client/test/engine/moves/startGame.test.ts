import { describe, expect, it } from "vitest";

import { applyMove, initialGameState } from "@/engine/applyMove";
import { standardDeck } from "@/engine/deck";
import { LAYOUT_SIZE, MAX_PLAYERS, MIN_PLAYERS } from "@/engine/rules";
import type { Card, StartedGame } from "@/engine/types";

import {
  allCards,
  createPlayers,
  expectStarted,
  startedGame,
  startGameMove,
  validateMove,
} from "@test/support/gameFixtures";

describe("startGame", () => {
  it.each([MIN_PLAYERS, 5, MAX_PLAYERS])(
    "deals four cards to each of %i players",
    (count) => {
      const state = startedGame(count);
      expect(state.seats).toHaveLength(count);
      expect(
        state.seats.every((seat) => seat.layout.length === LAYOUT_SIZE),
      ).toBe(true);
      expect(state.discardPile).toHaveLength(1);
      expect(state.drawPile).toHaveLength(
        standardDeck.length - count * LAYOUT_SIZE - 1,
      );
    },
  );

  it("uses every card of the deck exactly once", () => {
    const ids = allCards(startedGame(4)).map((card) => card.id);
    expect([...ids].sort((a, b) => a - b)).toEqual(
      standardDeck.map((card) => card.id),
    );
  });

  it("keeps the given player order and starts by viewing starting cards", () => {
    const state = startedGame(3);
    expect(state.seats.map((seat) => seat.player)).toEqual(createPlayers(3));
    expect(state.phase).toEqual({ kind: "startingView", viewedPlayerIds: [] });
    expect(state.moveCount).toBe(1);
  });

  it("deals identically for the same seed and differently for another seed", () => {
    expect(startedGame(4, 1)).toEqual(startedGame(4, 1));
    expect(startedGame(4, 1).seats).not.toEqual(startedGame(4, 2).seats);
  });

  it("rejects invalid player lists", () => {
    const tooFew = {
      ...startGameMove(),
      players: createPlayers(MIN_PLAYERS - 1),
    };
    const tooMany = {
      ...startGameMove(),
      players: createPlayers(MAX_PLAYERS + 1),
    };
    const [first, second] = createPlayers(2);
    if (!first || !second) {
      throw new Error("Expected two players");
    }
    const duplicate = {
      ...startGameMove(),
      players: [first, { ...second, id: first.id }],
    };
    const unnamed = {
      ...startGameMove(),
      players: [first, { ...second, name: "  " }],
    };
    expect(validateMove(initialGameState, tooFew)).toBe("invalidPlayerCount");
    expect(validateMove(initialGameState, tooMany)).toBe("invalidPlayerCount");
    expect(validateMove(initialGameState, duplicate)).toBe("duplicatePlayerId");
    expect(validateMove(initialGameState, unnamed)).toBe("invalidPlayerName");
  });

  it("starts a fresh game after a finished one", () => {
    const finished: StartedGame = {
      ...startedGame(3, 1),
      phase: { kind: "finished", results: [] },
      endCallerId: "player-2",
    };
    const rematch = expectStarted(applyMove(finished, startGameMove(3, 2)));
    expect(rematch).toEqual({
      ...startedGame(3, 2),
      moveCount: finished.moveCount + 1,
    });
  });

  it("rejects an invalid seed, an outside starter and a second start", () => {
    expect(validateMove(initialGameState, startGameMove(3, -1))).toBe(
      "invalidSeed",
    );
    expect(
      validateMove(initialGameState, {
        ...startGameMove(),
        playerId: "stranger",
      }),
    ).toBe("unknownPlayer");
    expect(validateMove(startedGame(), startGameMove())).toBe(
      "gameAlreadyStarted",
    );
  });

  describe("with a given deck", () => {
    const standardValues = standardDeck.map((card) => card.value);
    const orderedValues = [...standardValues].sort((a, b) => b - a);
    const startWith = (deck: readonly number[], playerCount = 2) =>
      applyMove(initialGameState, { ...startGameMove(playerCount), deck });

    it("deals the layouts, the first discard and the draw pile in the given order", () => {
      const state = expectStarted(startWith(orderedValues));
      const values = (cards: readonly (Card | null)[]) =>
        cards.map((card) => card?.value);
      expect(state.seats.map((seat) => values(seat.layout))).toEqual([
        orderedValues.slice(0, LAYOUT_SIZE),
        orderedValues.slice(LAYOUT_SIZE, 2 * LAYOUT_SIZE),
      ]);
      expect(values(state.discardPile)).toEqual([
        orderedValues[2 * LAYOUT_SIZE],
      ]);
      expect(values(state.drawPile)).toEqual(
        orderedValues.slice(2 * LAYOUT_SIZE + 1),
      );
    });

    it("uses every card of the deck exactly once", () => {
      const ids = allCards(expectStarted(startWith(orderedValues))).map(
        (card) => card.id,
      );
      expect([...ids].sort((a, b) => a - b)).toEqual(
        standardDeck.map((card) => card.id),
      );
    });

    it("ignores the seed for the card order", () => {
      const withSeed = (seed: number) =>
        expectStarted(
          applyMove(initialGameState, {
            ...startGameMove(2, seed),
            deck: orderedValues,
          }),
        );
      expect(withSeed(1).seats).toEqual(withSeed(2).seats);
      expect(withSeed(1).drawPile).toEqual(withSeed(2).drawPile);
    });

    it.each([
      ["a missing card", orderedValues.slice(1)],
      ["an extra card", [...orderedValues, 0]],
      ["a wrong card", [...orderedValues.slice(1), 99]],
      ["one card too often", [...orderedValues.slice(0, -1), 13]],
      ["no cards", []],
    ])("rejects %s", (_name, deck) => {
      expect(
        validateMove(initialGameState, { ...startGameMove(2), deck }),
      ).toBe("invalidDeck");
    });

    it("still validates the seed", () => {
      expect(
        validateMove(initialGameState, {
          ...startGameMove(2, -1),
          deck: orderedValues,
        }),
      ).toBe("invalidSeed");
    });
  });
});
