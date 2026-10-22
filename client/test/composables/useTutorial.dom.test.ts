import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NOTICE_MS,
  OPPONENT_MOVE_DELAY_MS,
  useTutorial,
} from "@/composables/useTutorial";
import { strings } from "@/data/strings";
import { situationOf } from "@/utils/tableIntent";
import { TUTORIAL_PLAYER } from "@/utils/tutorialScript";

import { guidedRounds } from "@test/support/guidedRound";
import { mountComposable } from "@test/support/mountComposable";

const MAX_WAITS_FOR_THE_ROUND = 60;

async function waitForOpponent(): Promise<void> {
  await vi.advanceTimersByTimeAsync(OPPONENT_MOVE_DELAY_MS);
}

async function playRoundToTheEnd(
  result: ReturnType<typeof useTutorial>,
): Promise<void> {
  const planned = (guidedRounds()[0]?.moves ?? []).filter(
    (move) => move.playerId === TUTORIAL_PLAYER.id && move.type !== "startGame",
  );
  for (let wait = 0; wait < MAX_WAITS_FOR_THE_ROUND; wait++) {
    const { state, moves } = result.snapshot.value.log;
    if (state.status !== "started" || state.phase.kind === "finished") {
      return;
    }
    const made = moves.filter(
      (move) =>
        move.playerId === TUTORIAL_PLAYER.id && move.type !== "startGame",
    ).length;
    const next = planned[made];
    if (next && situationOf(state, TUTORIAL_PLAYER.id).kind !== "waiting") {
      result.submitMove(next);
    }
    await vi.advanceTimersByTimeAsync(OPPONENT_MOVE_DELAY_MS);
  }
}

describe("useTutorial", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for the player to start, with both players present", () => {
    const { result } = mountComposable(useTutorial);

    expect(result.snapshot.value.log.state.status).toBe("notStarted");
    expect(result.snapshot.value.players).toHaveLength(2);
    expect(result.guide.value).toBeNull();
  });

  it("starts the round and lets the opponent look at its cards after a short while", async () => {
    const { result } = mountComposable(useTutorial);

    result.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(result.snapshot.value.log.moves).toHaveLength(1);
    expect(result.guide.value?.step).toBe("lookAtCards");

    await waitForOpponent();

    expect(result.snapshot.value.log.moves).toHaveLength(2);
  });

  it("drops moves that do not fit the lesson and explains why", async () => {
    const { result } = mountComposable(useTutorial);
    result.start();
    await waitForOpponent();
    result.submitMove({
      type: "viewStartingCards",
      playerId: TUTORIAL_PLAYER.id,
      slotIndices: [0, 1],
    });
    await vi.advanceTimersByTimeAsync(0);
    const movesBefore = result.snapshot.value.log.moves.length;

    result.submitMove({ type: "callEnd", playerId: TUTORIAL_PLAYER.id });
    await vi.advanceTimersByTimeAsync(0);

    expect(result.notice.value).toBe(strings.tutorial.hints.drawFirst);
    expect(result.snapshot.value.log.moves).toHaveLength(movesBefore);
  });

  it("takes the hint away after a while", async () => {
    const { result } = mountComposable(useTutorial);
    result.start();
    await waitForOpponent();
    result.submitMove({
      type: "viewStartingCards",
      playerId: TUTORIAL_PLAYER.id,
      slotIndices: [0, 1],
    });
    await vi.advanceTimersByTimeAsync(0);
    result.submitMove({ type: "callEnd", playerId: TUTORIAL_PLAYER.id });
    expect(result.notice.value).not.toBeNull();

    await vi.advanceTimersByTimeAsync(NOTICE_MS);

    expect(result.notice.value).toBeNull();
  });

  it("applies a move that fits the lesson and clears the notice", async () => {
    const { result } = mountComposable(useTutorial);
    result.start();
    await waitForOpponent();
    result.submitMove({
      type: "viewStartingCards",
      playerId: TUTORIAL_PLAYER.id,
      slotIndices: [0, 1],
    });
    await vi.advanceTimersByTimeAsync(0);
    result.submitMove({ type: "callEnd", playerId: TUTORIAL_PLAYER.id });

    result.submitMove({ type: "drawFromDeck", playerId: TUTORIAL_PLAYER.id });
    await vi.advanceTimersByTimeAsync(0);

    expect(result.notice.value).toBeNull();
    expect(result.guide.value?.step).toBe("keep");
  });

  it("starts over on restart", async () => {
    const { result } = mountComposable(useTutorial);
    result.start();
    await waitForOpponent();

    result.restart();
    await vi.advanceTimersByTimeAsync(0);

    expect(result.snapshot.value.log.moves).toHaveLength(1);
    expect(result.guide.value?.step).toBe("lookAtCards");
  });

  it("deals a new round from the start after the finished one", async () => {
    const { result } = mountComposable(useTutorial);
    result.start();
    await vi.advanceTimersByTimeAsync(0);
    await playRoundToTheEnd(result);
    expect(result.guide.value?.step).toBe("results");
    const finishedRound = result.round.value;

    result.restart();
    await vi.advanceTimersByTimeAsync(0);

    expect(result.round.value).toBe(finishedRound + 1);
    expect(result.snapshot.value.log.moves).toHaveLength(1);
    expect(result.guide.value?.step).toBe("lookAtCards");
  });

  it("stops the opponent when the tutorial is left", async () => {
    const { result, unmount } = mountComposable(useTutorial);
    result.start();
    await vi.advanceTimersByTimeAsync(0);
    unmount();

    await waitForOpponent();

    expect(result.snapshot.value.log.moves).toHaveLength(1);
  });
});
