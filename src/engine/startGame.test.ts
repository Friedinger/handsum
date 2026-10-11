import { describe, expect, it } from "vitest";
import { applyMove, initialGameState, validateMove } from "./applyMove";
import { standardDeck } from "./deck";
import { LAYOUT_SIZE, MAX_PLAYERS, MIN_PLAYERS } from "./rules";
import { allCards, createPlayers, expectStarted, startedGame, startGameMove } from "./testFixtures";
import type { StartedGame } from "./types";

describe("startGame", () => {
  it.each([MIN_PLAYERS, 5, MAX_PLAYERS])("deals four cards to each of %i players", (count) => {
    const state = startedGame(count);
    expect(state.seats).toHaveLength(count);
    expect(state.seats.every((seat) => seat.layout.length === LAYOUT_SIZE)).toBe(true);
    expect(state.discardPile).toHaveLength(1);
    expect(state.drawPile).toHaveLength(standardDeck.length - count * LAYOUT_SIZE - 1);
  });

  it("uses every card of the deck exactly once", () => {
    const ids = allCards(startedGame(4)).map((card) => card.id);
    expect([...ids].sort((a, b) => a - b)).toEqual(standardDeck.map((card) => card.id));
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
    const tooFew = { ...startGameMove(), players: createPlayers(MIN_PLAYERS - 1) };
    const tooMany = { ...startGameMove(), players: createPlayers(MAX_PLAYERS + 1) };
    const [first, second] = createPlayers(2);
    if (!first || !second) {
      throw new Error("Expected two players");
    }
    const duplicate = { ...startGameMove(), players: [first, { ...second, id: first.id }] };
    const unnamed = { ...startGameMove(), players: [first, { ...second, name: "  " }] };
    expect(validateMove(initialGameState, tooFew)).toBe("invalidPlayerCount");
    expect(validateMove(initialGameState, tooMany)).toBe("invalidPlayerCount");
    expect(validateMove(initialGameState, duplicate)).toBe("duplicatePlayerId");
    expect(validateMove(initialGameState, unnamed)).toBe("emptyPlayerName");
  });

  it("starts a fresh game after a finished one", () => {
    const finished: StartedGame = {
      ...startedGame(3, 1),
      phase: { kind: "finished", results: [] },
      endCallerId: "player-2",
    };
    const rematch = expectStarted(applyMove(finished, startGameMove(3, 2)));
    expect(rematch).toEqual({ ...startedGame(3, 2), moveCount: finished.moveCount + 1 });
  });

  it("rejects an invalid seed, an outside starter and a second start", () => {
    expect(validateMove(initialGameState, startGameMove(3, -1))).toBe("invalidSeed");
    expect(validateMove(initialGameState, { ...startGameMove(), playerId: "stranger" })).toBe(
      "unknownPlayer",
    );
    expect(validateMove(startedGame(), startGameMove())).toBe("gameAlreadyStarted");
  });
});
