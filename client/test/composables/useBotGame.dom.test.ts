import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBotGame } from "@/composables/useBotGame";
import type { Player } from "@/engine";

import { mountComposable } from "@test/support/mountComposable";

const DELAY_MS = 100;
const MAX_WAITS = 200;
const players: Player[] = [
  { id: "me", name: "Me" },
  { id: "bot-1", name: "Bot one" },
  { id: "bot-2", name: "Bot two" },
];

type BotGame = ReturnType<typeof useBotGame>;

function startedState(game: BotGame) {
  const { state } = game.snapshot.value.log;
  if (state.status !== "started") {
    throw new Error("Expected a started game");
  }
  return state;
}

/** Plays the person's turns by drawing and throwing away, until the condition holds. */
async function playUntil(
  game: BotGame,
  done: (state: ReturnType<typeof startedState>) => boolean,
): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  for (let wait = 0; wait < MAX_WAITS; wait++) {
    const state = startedState(game);
    if (done(state)) {
      return;
    }
    const { phase } = state;
    if (
      phase.kind === "startingView" &&
      !phase.viewedPlayerIds.includes("me")
    ) {
      game.submitMove({
        type: "viewStartingCards",
        playerId: "me",
        slotIndices: [0, 1],
      });
    } else if (phase.kind === "playing" && phase.currentPlayerId === "me") {
      game.submitMove(
        phase.step.kind === "awaitingChoice"
          ? { type: "drawFromDeck", playerId: "me" }
          : { type: "discardDrawnCard", playerId: "me" },
      );
    }
    await vi.advanceTimersByTimeAsync(DELAY_MS);
  }
  throw new Error("The game did not get there");
}

describe("useBotGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at once with the person first and a bot in every other seat", async () => {
    const { result } = mountComposable(() =>
      useBotGame({ players, delayMs: DELAY_MS }),
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(startedState(result).seats.map((seat) => seat.player)).toEqual(
      players,
    );
  });

  it("lets one bot after another look at its cards", async () => {
    const { result } = mountComposable(() =>
      useBotGame({ players, delayMs: DELAY_MS }),
    );
    const viewed = () => {
      const { phase } = startedState(result);
      return phase.kind === "startingView" ? phase.viewedPlayerIds : [];
    };

    await vi.advanceTimersByTimeAsync(DELAY_MS);
    const afterOneDelay = viewed();
    await vi.advanceTimersByTimeAsync(DELAY_MS);

    expect(afterOneDelay).toHaveLength(1);
    expect(viewed()).toEqual(expect.arrayContaining(["bot-1", "bot-2"]));
  });

  it("makes the next bot announce the end when asked to", async () => {
    const { result } = mountComposable(() =>
      useBotGame({ players, delayMs: DELAY_MS }),
    );

    result.requestEnd();
    await playUntil(result, (state) => state.endCallerId !== null);

    expect(startedState(result).endCallerId).toMatch(/^bot-/);
    expect(result.endRequested.value).toBe(false);
  });

  it("plays one round after another", async () => {
    const { result } = mountComposable(() =>
      useBotGame({ players, delayMs: DELAY_MS }),
    );
    result.requestEnd();
    await playUntil(result, (state) => state.phase.kind === "finished");

    result.playAgain();
    await vi.advanceTimersByTimeAsync(0);

    expect(startedState(result).phase.kind).toBe("startingView");
    expect(result.snapshot.value.log.finishedRounds).toHaveLength(1);
  });

  it("stops the bots when it is unmounted", async () => {
    const { result, unmount } = mountComposable(() =>
      useBotGame({ players, delayMs: DELAY_MS }),
    );
    await vi.advanceTimersByTimeAsync(0);
    const movesBefore = result.snapshot.value.log.moves.length;

    unmount();
    await vi.advanceTimersByTimeAsync(DELAY_MS * 10);

    expect(result.snapshot.value.log.moves).toHaveLength(movesBefore);
  });
});
