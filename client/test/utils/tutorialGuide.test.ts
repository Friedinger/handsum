import { describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import { applyMove, initialGameState, type Move } from "@/engine";
import { guideFor } from "@/utils/tutorialGuide";
import { TUTORIAL_PLAYER, type TutorialStepId } from "@/utils/tutorialScript";

import { expectStarted } from "@test/support/gameFixtures";
import { guidedRounds } from "@test/support/guidedRound";

const playerId = TUTORIAL_PLAYER.id;

function stepsAlong(moves: readonly Move[]): TutorialStepId[] {
  const steps = moves.map((_, index) => {
    const played = moves.slice(0, index + 1);
    const state = expectStarted(played.reduce(applyMove, initialGameState));
    return guideFor(played, state, playerId).step;
  });
  return steps.filter((step, index) => step !== steps[index - 1]);
}

function guideBefore(moves: readonly Move[], index: number) {
  const played = moves.slice(0, index);
  const state = expectStarted(played.reduce(applyMove, initialGameState));
  return guideFor(played, state, playerId);
}

/**
 * The guide before the player's n-th move of the given type, plus that move.
 */
function atPlayersMove(type: Move["type"], occurrence = 0) {
  const moves = guidedRounds()[0]?.moves ?? [];
  const index = moves
    .map((move, moveIndex) =>
      move.type === type && move.playerId === playerId ? moveIndex : -1,
    )
    .filter((moveIndex) => moveIndex >= 0)[occurrence];
  const move = index === undefined ? undefined : moves[index];
  if (index === undefined || !move) {
    throw new Error(`No ${type} move found`);
  }
  return { guide: guideBefore(moves, index), move };
}

describe("tutorial guide", () => {
  it("walks through the lessons in order", () => {
    const moves = guidedRounds()[0]?.moves ?? [];

    expect(stepsAlong(moves)).toEqual([
      "lookAtCards",
      "draw",
      "keep",
      "watchOpponent",
      "drawAgain",
      "viewOwn",
      "watchOpponent",
      "drawAgain",
      "viewOther",
      "watchOpponent",
      "drawAgain",
      "exchangeBlind",
      "watchOpponent",
      "drawAgain",
      "groupReplace",
      "watchOpponent",
      "takeDiscard",
      "watchOpponent",
      "callEnd",
      "lastRound",
      "results",
    ]);
  });

  it("asks the player to remember the cards while the opponent is not ready", () => {
    const [start, , view] = guidedRounds()[0]?.moves ?? [];
    const played = start && view ? [start, view] : [];
    const state = expectStarted(played.reduce(applyMove, initialGameState));

    expect(guideFor(played, state, playerId).step).toBe("remember");
  });

  it("only allows the two cards on the left in the starting view", () => {
    const { guide, move } = atPlayersMove("viewStartingCards");

    expect(guide.hintAgainst(move)).toBeNull();
    expect(
      guide.hintAgainst({
        type: "viewStartingCards",
        playerId,
        slotIndices: [2, 3],
      }),
    ).toBe(strings.tutorial.hints.lookAtLeftCards(2));
  });

  it("only allows drawing at the start of a turn", () => {
    const { guide, move } = atPlayersMove("drawFromDeck");

    expect(guide.step).toBe("draw");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(guide.hintAgainst({ type: "callEnd", playerId })).toBe(
      strings.tutorial.hints.drawFirst,
    );
  });

  it("only allows swapping the drawn card with the highest remembered card", () => {
    const { guide, move } = atPlayersMove("swapDrawnCard");

    expect(guide.step).toBe("keep");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(guide.hintAgainst({ type: "discardDrawnCard", playerId })).toMatch(
      /highest card you remember/,
    );
    expect(
      guide.hintAgainst({
        type: "swapDrawnCard",
        playerId,
        slotIndices: [0, 1],
      }),
    ).not.toBeNull();
  });

  it("requires looking at the first unseen card with the view own card power", () => {
    const { guide, move } = atPlayersMove("viewOwnCard");

    expect(guide.step).toBe("viewOwn");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(
      guide.hintAgainst({ type: "viewOwnCard", playerId, slotIndex: 0 }),
    ).toMatch(/not seen yet/);
  });

  it("requires looking at the opponent's lowest card with the view other card power", () => {
    const { guide, move } = atPlayersMove("viewOtherCard");

    expect(guide.step).toBe("viewOther");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(guide.hintAgainst({ type: "discardDrawnCard", playerId })).toMatch(
      /Robin.s card at position/,
    );
  });

  it("requires trading the unseen card for the card just looked at", () => {
    const { guide, move } = atPlayersMove("exchangeBlind");

    expect(guide.step).toBe("exchangeBlind");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(guide.hintAgainst({ type: "discardDrawnCard", playerId })).toMatch(
      /trade your high card/,
    );
  });

  it("requires replacing the two equal cards at once", () => {
    const { guide, move } = atPlayersMove("swapDrawnCard", 1);

    expect(guide.step).toBe("groupReplace");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(
      guide.hintAgainst({
        type: "swapDrawnCard",
        playerId,
        slotIndices: [3],
      }),
    ).toMatch(/same number/);
  });

  it("requires taking the discard card instead of drawing", () => {
    const { guide, move } = atPlayersMove("swapDiscardCard");

    expect(guide.step).toBe("takeDiscard");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(guide.hintAgainst({ type: "drawFromDeck", playerId })).toMatch(
      /discard pile/,
    );
  });

  it("requires calling the end at the end", () => {
    const { guide, move } = atPlayersMove("callEnd");

    expect(guide.step).toBe("callEnd");
    expect(guide.hintAgainst(move)).toBeNull();
    expect(guide.hintAgainst({ type: "drawFromDeck", playerId })).toBe(
      strings.tutorial.hints.callEndNow,
    );
  });
});
