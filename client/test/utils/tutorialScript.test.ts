import { describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import {
  applyMove,
  type Card,
  initialGameState,
  type Move,
  type StartedGame,
} from "@/engine";
import { arrangeDeck } from "@/engine/deck";
import { guideFor } from "@/utils/tutorialGuide";
import {
  nextOpponentMove,
  TUTORIAL_DECK,
  TUTORIAL_OPPONENT,
  TUTORIAL_PLAYER,
  TUTORIAL_SEED,
} from "@/utils/tutorialScript";

import { expectStarted } from "@test/support/gameFixtures";
import {
  type GuidedRound,
  guidedRounds,
  type PlayedMove,
  playersMoves,
} from "@test/support/guidedRound";
import { knownOwnSlots, knowsAllOwnCards } from "@test/support/knownCards";

const LOW_CARD_MAX = 2;
const HIGH_CARD_MIN = 9;
const OPPONENT_KEEP_MAX = 4;
const MIN_LEAD_IN_SUM = 8;

function playerTurns(round: GuidedRound, type: Move["type"]): PlayedMove[] {
  return playersMoves(round).filter(({ move }) => move.type === type);
}

function layoutOf(state: StartedGame, playerId: string) {
  return state.seats.find((seat) => seat.player.id === playerId)?.layout ?? [];
}

function valuesAt(
  state: StartedGame,
  playerId: string,
  slotIndices: readonly number[],
): number[] {
  const layout = layoutOf(state, playerId);
  return slotIndices.flatMap((slotIndex) => {
    const card = layout[slotIndex];
    return card ? [card.value] : [];
  });
}

function heldCard(state: StartedGame): Card | undefined {
  return state.phase.kind === "playing" &&
    state.phase.step.kind === "holdingDrawnCard"
    ? state.phase.step.card
    : undefined;
}

describe("tutorial deck", () => {
  it("is exactly the standard deck", () => {
    expect(arrangeDeck(TUTORIAL_DECK)).not.toBeNull();
  });
});

describe("tutorial script", () => {
  const rounds = guidedRounds();

  it("plays through to the end for every choice the guide allows", () => {
    expect(rounds.length).toBeGreaterThan(0);
    expect(rounds.every((round) => round.finished)).toBe(true);
  });

  it("lets the player win clearly", () => {
    for (const { playerResult, opponentResult } of rounds) {
      expect(playerResult?.isWinner).toBe(true);
      expect(
        (opponentResult?.cardSum ?? 0) - (playerResult?.cardSum ?? 0),
      ).toBeGreaterThanOrEqual(MIN_LEAD_IN_SUM);
    }
  });

  it("starts with a high card on the discard pile and no pair in the starting view", () => {
    for (const { startingState } of rounds) {
      const [first, second] = valuesAt(
        startingState,
        TUTORIAL_PLAYER.id,
        [0, 1],
      );
      expect(startingState.discardPile[0]?.value).toBeGreaterThanOrEqual(
        HIGH_CARD_MIN,
      );
      expect(first).not.toBe(second);
    }
  });

  it("deals a low card to keep in place of a clearly higher one", () => {
    for (const round of rounds) {
      const [keep] = playerTurns(round, "swapDrawnCard");
      const held = keep && heldCard(keep.stateBefore);
      const replaced =
        keep?.move.type === "swapDrawnCard"
          ? valuesAt(
              keep.stateBefore,
              TUTORIAL_PLAYER.id,
              keep.move.slotIndices,
            )
          : [];
      expect(held?.action).toBeNull();
      expect(held?.value).toBeLessThanOrEqual(LOW_CARD_MAX);
      expect(replaced[0]).toBeGreaterThanOrEqual(HIGH_CARD_MIN);
    }
  });

  it("teaches every card power exactly once", () => {
    for (const round of rounds) {
      for (const type of [
        "viewOwnCard",
        "viewOtherCard",
        "exchangeBlind",
      ] as const) {
        expect(playerTurns(round, type)).toHaveLength(1);
      }
    }
  });

  it("looks at a low card of the opponent", () => {
    for (const round of rounds) {
      const [view] = playerTurns(round, "viewOtherCard");
      const viewed =
        view?.move.type === "viewOtherCard"
          ? valuesAt(view.stateBefore, TUTORIAL_OPPONENT.id, [
              view.move.slotIndex,
            ])
          : [];
      expect(viewed[0]).toBeLessThanOrEqual(LOW_CARD_MAX);
    }
  });

  it("gives away a known high card for the low card seen before", () => {
    for (const round of rounds) {
      const [exchange] = playerTurns(round, "exchangeBlind");
      if (exchange?.move.type !== "exchangeBlind") {
        throw new Error("Expected a blind exchange");
      }
      const { ownSlotIndex, targetSlotIndex } = exchange.move;
      const [given] = valuesAt(exchange.stateBefore, TUTORIAL_PLAYER.id, [
        ownSlotIndex,
      ]);
      const [received] = valuesAt(exchange.stateBefore, TUTORIAL_OPPONENT.id, [
        targetSlotIndex,
      ]);
      expect(
        knownOwnSlots(exchange.movesBefore, TUTORIAL_PLAYER.id).has(
          ownSlotIndex,
        ),
      ).toBe(true);
      expect(given).toBeGreaterThanOrEqual(HIGH_CARD_MIN);
      expect(received).toBeLessThanOrEqual(LOW_CARD_MAX);
    }
  });

  it("replaces a group of two known equal cards by a low card", () => {
    for (const round of rounds) {
      const group = playerTurns(round, "swapDrawnCard").find(
        ({ move }) =>
          move.type === "swapDrawnCard" && move.slotIndices.length > 1,
      );
      if (group?.move.type !== "swapDrawnCard") {
        throw new Error("Expected a group replacement");
      }
      const outgoing = valuesAt(
        group.stateBefore,
        TUTORIAL_PLAYER.id,
        group.move.slotIndices,
      );
      const known = knownOwnSlots(group.movesBefore, TUTORIAL_PLAYER.id);
      expect(outgoing).toHaveLength(2);
      expect(new Set(outgoing).size).toBe(1);
      expect(group.move.slotIndices.every((slot) => known.has(slot))).toBe(
        true,
      );
      expect(heldCard(group.stateBefore)?.value).toBeLessThanOrEqual(
        LOW_CARD_MAX,
      );
    }
  });

  it("puts a low card on the discard pile when the opponent swaps away a card he never saw", () => {
    for (const round of rounds) {
      const [take] = playerTurns(round, "swapDiscardCard");
      const taken = take?.stateBefore.discardPile[0]?.value ?? Infinity;
      const lastMove = take?.movesBefore.at(-1);
      expect(taken).toBeLessThanOrEqual(LOW_CARD_MAX);
      expect(lastMove).toMatchObject({
        type: "swapDrawnCard",
        playerId: TUTORIAL_OPPONENT.id,
      });
    }
  });

  it("never lets the opponent throw away a drawn low card", () => {
    for (const round of rounds) {
      const discards = round.played.filter(
        ({ move }) =>
          move.playerId === TUTORIAL_OPPONENT.id &&
          move.type === "discardDrawnCard",
      );
      expect(discards.length).toBeGreaterThan(0);
      for (const { stateBefore } of discards) {
        expect(heldCard(stateBefore)?.value).toBeGreaterThan(OPPONENT_KEEP_MAX);
      }
    }
  });

  it("only lets the player call the end after seeing all their cards", () => {
    for (const round of rounds) {
      const [callEnd] = playerTurns(round, "callEnd");
      expect(callEnd).toBeDefined();
      expect(
        callEnd &&
          knowsAllOwnCards(
            callEnd.movesBefore,
            callEnd.stateBefore,
            TUTORIAL_PLAYER.id,
          ),
      ).toBe(true);
    }
  });
});

describe("tutorial start", () => {
  it("lets the player start, because the lessons begin with the player's draw", () => {
    const [round] = guidedRounds();
    const [firstTurn] = (round?.played ?? []).filter(
      ({ move }) => move.type === "drawFromDeck",
    );

    expect(
      firstTurn?.move.playerId,
      "TUTORIAL_SEED must make the player start; pick another seed if the starting player derivation changed",
    ).toBe(TUTORIAL_PLAYER.id);
  });

  it("names the position of the taken card as the table shows it after the group", () => {
    for (const round of guidedRounds()) {
      const [take] = playerTurns(round, "swapDiscardCard");
      if (take?.move.type !== "swapDiscardCard") {
        throw new Error("Expected taking the discard card");
      }
      const [slot = -1] = take.move.slotIndices;
      const shownBefore = layoutOf(take.stateBefore, TUTORIAL_PLAYER.id)
        .slice(0, slot + 1)
        .filter((card) => card !== null);
      const guide = guideFor(
        take.movesBefore,
        take.stateBefore,
        TUTORIAL_PLAYER.id,
      );

      expect(
        guide.hintAgainst({
          type: "drawFromDeck",
          playerId: TUTORIAL_PLAYER.id,
        }),
      ).toBe(strings.tutorial.hints.takeLowDiscard(shownBefore.length));
    }
  });
});

describe("tutorial opponent", () => {
  const start: Move = {
    type: "startGame",
    playerId: TUTORIAL_PLAYER.id,
    players: [TUTORIAL_PLAYER, TUTORIAL_OPPONENT],
    seed: TUTORIAL_SEED,
    deck: TUTORIAL_DECK,
  };

  function playedStarted(...moves: Move[]) {
    const all = [start, ...moves];
    return {
      state: expectStarted(all.reduce(applyMove, initialGameState)),
      all,
    };
  }

  it("looks at its own cards once the game started", () => {
    const { state, all } = playedStarted();
    const view = nextOpponentMove(state, all);
    const afterView = view && playedStarted(view);

    expect(view).toMatchObject({
      type: "viewStartingCards",
      playerId: TUTORIAL_OPPONENT.id,
    });
    expect(
      afterView && nextOpponentMove(afterView.state, afterView.all),
    ).toBeNull();
  });

  it("draws in its turn and otherwise waits", () => {
    const first = playedStarted();
    const opponentView = nextOpponentMove(first.state, first.all);
    const view = {
      type: "viewStartingCards",
      playerId: TUTORIAL_PLAYER.id,
      slotIndices: [0, 1],
    } satisfies Move;
    const draw = {
      type: "drawFromDeck",
      playerId: TUTORIAL_PLAYER.id,
    } satisfies Move;
    const swap = {
      type: "swapDrawnCard",
      playerId: TUTORIAL_PLAYER.id,
      slotIndices: [0],
    } satisfies Move;
    const setup = opponentView ? [opponentView, view] : [view];
    const duringPlayersTurn = playedStarted(...setup, draw);
    const afterPlayersTurn = playedStarted(...setup, draw, swap);

    expect(
      nextOpponentMove(duringPlayersTurn.state, duringPlayersTurn.all),
    ).toBeNull();
    expect(
      nextOpponentMove(afterPlayersTurn.state, afterPlayersTurn.all),
    ).toMatchObject({ type: "drawFromDeck" });
  });

  it("keeps low cards on cards it has never seen and throws away the rest", () => {
    const [round] = guidedRounds();
    const turns = (round?.played ?? []).filter(
      ({ move }) => move.playerId === TUTORIAL_OPPONENT.id,
    );
    const kept = turns.filter(({ move }) => move.type === "swapDrawnCard");

    expect(kept.length).toBeGreaterThan(0);
    for (const { move, stateBefore } of kept) {
      expect(heldCard(stateBefore)?.value).toBeLessThanOrEqual(
        OPPONENT_KEEP_MAX,
      );
      expect(move).toMatchObject({ slotIndices: [expect.any(Number)] });
    }
  });
});
