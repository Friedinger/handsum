import { describe, expect, it } from "vitest";

import type { Move, StartedGame } from "@/engine";
import { type Highlight, noHighlight } from "@/utils/tableHighlight";
import { type ClickTarget, type Intent, noIntent } from "@/utils/tableIntent";
import { handleClick } from "@/utils/tableInteraction";
import { tutorialHighlight } from "@/utils/tutorialHighlight";
import { TUTORIAL_PLAN, TUTORIAL_PLAYER } from "@/utils/tutorialScript";

import { guidedRounds, playersMoves } from "@test/support/guidedRound";

const selfId = TUTORIAL_PLAYER.id;
const rounds = guidedRounds();
const playerSteps = (rounds[0] ? playersMoves(rounds[0]) : []).map(
  (played, index) => ({ ...played, lesson: TUTORIAL_PLAN[index] }),
);

function highlightFor(
  index: number,
  intent: Intent = noIntent,
  state?: StartedGame,
): Highlight {
  const step = playerSteps[index];
  if (!step?.lesson) {
    throw new Error(`No lesson ${String(index)}`);
  }
  return tutorialHighlight(
    step.lesson.move,
    intent,
    state ?? step.stateBefore,
    selfId,
  );
}

const own = (slotIndex: number): ClickTarget => ({
  kind: "slot",
  slot: { playerId: selfId, slotIndex },
});

/**
 * Follows the markers like a player who always clicks the first marked thing.
 */
function followMarkers(
  state: StartedGame,
  lessonIndex: number,
): { clicks: number; move: Move | null } {
  let intent: Intent = noIntent;
  for (let clicks = 1; clicks <= 10; clicks += 1) {
    const highlight = highlightFor(lessonIndex, intent, state);
    if (highlight.callEnd) {
      return {
        clicks: clicks + 1,
        move: { type: "callEnd", playerId: selfId },
      };
    }
    const target = highlight.targets[0];
    if (!target) {
      return { clicks, move: null };
    }
    const outcome = handleClick(state, selfId, intent, target);
    if (outcome.move) {
      return { clicks, move: outcome.move };
    }
    intent = outcome.intent;
  }
  return { clicks: 0, move: null };
}

function sortedSlots(move: Move): Move {
  return "slotIndices" in move
    ? { ...move, slotIndices: [...move.slotIndices].sort() }
    : move;
}

describe("tutorial highlight", () => {
  it("leads to the planned move at every step of the round", () => {
    expect(playerSteps).toHaveLength(TUTORIAL_PLAN.length);
    for (const [index, { move, stateBefore }] of playerSteps.entries()) {
      const followed = followMarkers(stateBefore, index);

      expect(followed.move && sortedSlots(followed.move)).toEqual(
        sortedSlots(move),
      );
    }
  });

  it("marks the two left cards of the starting view and drops them once selected", () => {
    expect(highlightFor(0).targets).toEqual([own(0), own(1)]);
    expect(
      highlightFor(0, { kind: "pickStartingCards", slotIndices: [1] }).targets,
    ).toEqual([own(0)]);
  });

  it("marks the draw pile at the start of a turn", () => {
    expect(highlightFor(1).targets).toEqual([{ kind: "drawPile" }]);
  });

  it("marks the card to keep, then the discard pile", () => {
    expect(highlightFor(2).targets).toEqual([own(0)]);
    expect(
      highlightFor(2, { kind: "selectingSwapCards", slotIndices: [0] }).targets,
    ).toEqual([{ kind: "discardPile" }]);
  });

  it("marks the held card, then the target of a power", () => {
    expect(highlightFor(4).targets).toEqual([{ kind: "heldCard" }]);
    expect(
      highlightFor(4, {
        kind: "action",
        action: "viewOwn",
        ownSlotIndex: null,
        target: null,
      }).targets,
    ).toEqual([own(2)]);
    expect(highlightFor(6).targets).toEqual([{ kind: "heldCard" }]);
    expect(
      highlightFor(6, {
        kind: "action",
        action: "viewOther",
        ownSlotIndex: null,
        target: null,
      }).targets,
    ).toEqual([
      { kind: "slot", slot: { playerId: "tutorial-opponent", slotIndex: 1 } },
    ]);
  });

  it("marks own card first and the opponent's card second for the blind exchange", () => {
    const action: Intent = {
      kind: "action",
      action: "exchangeBlind",
      ownSlotIndex: null,
      target: null,
    };

    expect(highlightFor(8, action).targets).toEqual([own(2)]);
    expect(highlightFor(8, { ...action, ownSlotIndex: 2 }).targets).toEqual([
      { kind: "slot", slot: { playerId: "tutorial-opponent", slotIndex: 1 } },
    ]);
  });

  it("marks both cards of the group, then the discard pile", () => {
    expect(highlightFor(10).targets).toEqual([own(0), own(2)]);
    expect(
      highlightFor(10, { kind: "selectingSwapCards", slotIndices: [0] })
        .targets,
    ).toEqual([own(2)]);
    expect(
      highlightFor(10, { kind: "selectingSwapCards", slotIndices: [0, 2] })
        .targets,
    ).toEqual([{ kind: "discardPile" }]);
  });

  it("marks the discard pile, the unseen card and the discard pile again to take the discard", () => {
    expect(highlightFor(11).targets).toEqual([{ kind: "discardPile" }]);
    expect(
      highlightFor(11, { kind: "takingDiscard", slotIndices: [] }).targets,
    ).toEqual([own(3)]);
    expect(
      highlightFor(11, { kind: "takingDiscard", slotIndices: [3] }).targets,
    ).toEqual([{ kind: "discardPile" }]);
  });

  it("marks the call end button", () => {
    expect(highlightFor(12)).toEqual({ targets: [], callEnd: true });
  });

  it("marks nothing while the opponent plays", () => {
    const opponentTurn = rounds[0]?.played.find(
      ({ move, stateBefore }) =>
        move.playerId !== selfId && stateBefore.phase.kind === "playing",
    )?.stateBefore;

    expect(opponentTurn).toBeDefined();
    expect(highlightFor(2, noIntent, opponentTurn)).toEqual(noHighlight);
  });

  it("marks a wrongly selected card so it is deselected first", () => {
    expect(
      highlightFor(0, { kind: "pickStartingCards", slotIndices: [3] }).targets,
    ).toEqual([own(3)]);
    expect(
      highlightFor(2, { kind: "selectingSwapCards", slotIndices: [0, 1] })
        .targets,
    ).toEqual([own(1)]);
    expect(
      highlightFor(10, { kind: "selectingSwapCards", slotIndices: [0, 1, 2] })
        .targets,
    ).toEqual([own(1)]);
    expect(
      highlightFor(11, { kind: "takingDiscard", slotIndices: [3, 0] }).targets,
    ).toEqual([own(0)]);
  });

  it("marks the own card again when a wrong one was chosen for the blind exchange", () => {
    expect(
      highlightFor(8, {
        kind: "action",
        action: "exchangeBlind",
        ownSlotIndex: 0,
        target: null,
      }).targets,
    ).toEqual([own(2)]);
  });

  it("marks the click that takes back a start the lesson does not want", () => {
    expect(
      highlightFor(1, { kind: "takingDiscard", slotIndices: [] }).targets,
    ).toEqual([{ kind: "discardPile" }]);
    expect(
      highlightFor(1, { kind: "takingDiscard", slotIndices: [2] }).targets,
    ).toEqual([own(2)]);
    expect(
      highlightFor(4, { kind: "selectingSwapCards", slotIndices: [1] }).targets,
    ).toEqual([own(1)]);
    expect(
      highlightFor(2, {
        kind: "action",
        action: "viewOwn",
        ownSlotIndex: null,
        target: null,
      }).targets,
    ).toEqual([{ kind: "heldCard" }]);
    expect(
      highlightFor(12, { kind: "takingDiscard", slotIndices: [] }),
    ).toEqual({ targets: [{ kind: "discardPile" }], callEnd: false });
  });
});
