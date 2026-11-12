import type { Move } from "@/engine";
import type { SessionSnapshot } from "@/net/gameSession";

export interface BotPlanner {
  readonly plan: (snapshot: SessionSnapshot) => void;
  readonly cancel: () => void;
}

interface BotPlannerOptions {
  readonly nextMove: (snapshot: SessionSnapshot) => Move | null;
  readonly submit: (move: Move) => void;
  readonly delayMs: number;
}

/**
 * Plays a bot's next move after a short delay, so people can follow it. A snapshot that changes
 * nothing about the game keeps the move already planned instead of starting the delay again.
 */
export function createBotPlanner({
  nextMove,
  submit,
  delayMs,
}: BotPlannerOptions): BotPlanner {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let plannedAtMoveCount: number | null = null;

  const cancel = () => {
    clearTimeout(timer);
    plannedAtMoveCount = null;
  };

  const plan = (snapshot: SessionSnapshot) => {
    const { state } = snapshot.log;
    const move = state.status === "started" ? nextMove(snapshot) : null;
    if (state.status !== "started" || !move) {
      cancel();
      return;
    }
    if (plannedAtMoveCount === state.moveCount) {
      return;
    }
    clearTimeout(timer);
    plannedAtMoveCount = state.moveCount;
    timer = setTimeout(() => {
      submit(move);
    }, delayMs);
  };

  return { plan, cancel };
}
