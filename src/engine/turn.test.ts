import { describe, expect, it } from "vitest";
import { applyMove, validateMove } from "./applyMove";
import { legalMoves } from "./legalMoves";
import type { Move } from "./moves";
import { currentPlayerId, expectStarted, playingGame, startedGame } from "./testFixtures";
import type { StartedGame } from "./types";

function apply(state: StartedGame, move: Move): StartedGame {
  return expectStarted(applyMove(state, move));
}

function layoutOf(state: StartedGame, seatIndex: number) {
  return state.seats[seatIndex]?.layout ?? [];
}

describe("drawFromDeck", () => {
  it("moves the top card of the draw pile into the current player's hand", () => {
    const state = playingGame();
    const afterDraw = apply(state, { type: "drawFromDeck", playerId: "player-1" });
    expect(afterDraw.drawPile).toEqual(state.drawPile.slice(1));
    expect(afterDraw.phase).toEqual({
      kind: "playing",
      currentPlayerId: "player-1",
      step: { kind: "holdingDrawnCard", card: state.drawPile[0] },
    });
  });

  it("is only allowed for the current player before any choice", () => {
    const state = playingGame();
    expect(validateMove(state, { type: "drawFromDeck", playerId: "player-2" })).toBe("notYourTurn");
    expect(validateMove(startedGame(), { type: "drawFromDeck", playerId: "player-1" })).toBe(
      "wrongPhase",
    );
    const afterDraw = apply(state, { type: "drawFromDeck", playerId: "player-1" });
    expect(validateMove(afterDraw, { type: "drawFromDeck", playerId: "player-1" })).toBe(
      "wrongTurnStep",
    );
  });
});

describe("discardDrawnCard", () => {
  it("puts the drawn card on the discard pile and passes the turn", () => {
    const state = apply(playingGame(), { type: "drawFromDeck", playerId: "player-1" });
    const afterDiscard = apply(state, { type: "discardDrawnCard", playerId: "player-1" });
    expect(afterDiscard.discardPile[0]).toEqual(playingGame().drawPile[0]);
    expect(currentPlayerId(afterDiscard)).toBe("player-2");
  });

  it("requires a drawn card", () => {
    expect(validateMove(playingGame(), { type: "discardDrawnCard", playerId: "player-1" })).toBe(
      "wrongTurnStep",
    );
  });
});

describe("swapDrawnCard", () => {
  it("replaces a layout card and discards the replaced one", () => {
    const state = apply(playingGame(), { type: "drawFromDeck", playerId: "player-1" });
    const drawnCard = playingGame().drawPile[0];
    const replacedCard = layoutOf(state, 0)[2];
    const afterSwap = apply(state, { type: "swapDrawnCard", playerId: "player-1", slotIndex: 2 });
    expect(layoutOf(afterSwap, 0)[2]).toEqual(drawnCard);
    expect(afterSwap.discardPile[0]).toEqual(replacedCard);
    expect(currentPlayerId(afterSwap)).toBe("player-2");
  });

  it("rejects slots outside the layout", () => {
    const state = apply(playingGame(), { type: "drawFromDeck", playerId: "player-1" });
    for (const slotIndex of [-1, 4, 1.5]) {
      expect(validateMove(state, { type: "swapDrawnCard", playerId: "player-1", slotIndex })).toBe(
        "invalidSlot",
      );
    }
  });
});

describe("swapDiscardCard", () => {
  it("takes the top discard into the layout and discards the replaced card", () => {
    const state = playingGame();
    const takenCard = state.discardPile[0];
    const replacedCard = layoutOf(state, 0)[1];
    const afterSwap = apply(state, { type: "swapDiscardCard", playerId: "player-1", slotIndex: 1 });
    expect(layoutOf(afterSwap, 0)[1]).toEqual(takenCard);
    expect(afterSwap.discardPile).toEqual([replacedCard]);
    expect(afterSwap.drawPile).toEqual(state.drawPile);
  });

  it("is not allowed after drawing", () => {
    const state = apply(playingGame(), { type: "drawFromDeck", playerId: "player-1" });
    expect(
      validateMove(state, { type: "swapDiscardCard", playerId: "player-1", slotIndex: 0 }),
    ).toBe("wrongTurnStep");
  });
});

describe("turn order", () => {
  it("passes the turn around the table and back to the first seat", () => {
    let state = playingGame(3);
    const order: string[] = [];
    for (let turn = 0; turn < 4; turn++) {
      const playerId = currentPlayerId(state);
      order.push(playerId);
      state = apply(state, { type: "swapDiscardCard", playerId, slotIndex: 0 });
    }
    expect(order).toEqual(["player-1", "player-2", "player-3", "player-1"]);
  });
});

describe("legalMoves", () => {
  it("lists ready during the peek phase only for players not yet ready", () => {
    const state = startedGame(2);
    expect(legalMoves(state, "player-1")).toEqual([{ type: "ready", playerId: "player-1" }]);
    const afterReady = apply(state, { type: "ready", playerId: "player-1" });
    expect(legalMoves(afterReady, "player-1")).toEqual([]);
  });

  it("lists drawing and discard swaps at the start of a turn and nothing for others", () => {
    const state = playingGame();
    expect(legalMoves(state, "player-1").map((move) => move.type)).toEqual([
      "drawFromDeck",
      "swapDiscardCard",
      "swapDiscardCard",
      "swapDiscardCard",
      "swapDiscardCard",
    ]);
    expect(legalMoves(state, "player-2")).toEqual([]);
  });

  it("lists discarding and swapping while holding a drawn card", () => {
    const state = apply(playingGame(), { type: "drawFromDeck", playerId: "player-1" });
    expect(legalMoves(state, "player-1").map((move) => move.type)).toEqual([
      "discardDrawnCard",
      "swapDrawnCard",
      "swapDrawnCard",
      "swapDrawnCard",
      "swapDrawnCard",
    ]);
  });
});
