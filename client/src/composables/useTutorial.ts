import { computed, onUnmounted, ref, shallowRef, watch } from "vue";

import { createBotPlanner } from "@/composables/botPlanner";
import type { Move, MoveRejection, Player } from "@/engine";
import {
  createGameSession,
  type GameSession,
  initialSnapshot,
  type SessionSnapshot,
} from "@/net/gameSession";
import { createLocalRoom } from "@/net/localTransport";
import { TUTORIAL_ROOM_CODE } from "@/utils/roomNavigation";
import { guideFor } from "@/utils/tutorialGuide";
import {
  nextOpponentMove,
  TUTORIAL_DECK,
  TUTORIAL_OPPONENT,
  TUTORIAL_PLAYER,
  TUTORIAL_SEED,
} from "@/utils/tutorialScript";

export const OPPONENT_MOVE_DELAY_MS = 1200;
export const NOTICE_MS = 5000;

function helloOf({ id, name }: Player) {
  return { playerId: id, name };
}

interface RunningTutorial {
  readonly player: GameSession;
  readonly stop: () => void;
}

function startRunning(
  onPlayerChange: (snapshot: SessionSnapshot) => void,
): RunningTutorial {
  const connect = createLocalRoom();
  let stopped = false;
  const planner = createBotPlanner({
    nextMove: ({ log }) =>
      log.state.status === "started"
        ? nextOpponentMove(log.state, log.moves)
        : null,
    submit: (move) => {
      opponent.submitMove(move);
    },
    delayMs: OPPONENT_MOVE_DELAY_MS,
  });

  const player = createGameSession({
    roomCode: TUTORIAL_ROOM_CODE,
    self: helloOf(TUTORIAL_PLAYER),
    connect,
    onChange: (next) => {
      if (!stopped) {
        onPlayerChange(next);
      }
    },
  });
  const opponent = createGameSession({
    roomCode: TUTORIAL_ROOM_CODE,
    self: helloOf(TUTORIAL_OPPONENT),
    connect,
    onChange: (next) => {
      if (!stopped) {
        planner.plan(next);
      }
    },
  });

  return {
    player,
    stop: () => {
      stopped = true;
      planner.cancel();
      opponent.leave();
      player.leave();
    },
  };
}

export function useTutorial() {
  const snapshot = shallowRef<SessionSnapshot>(
    initialSnapshot(TUTORIAL_ROOM_CODE, helloOf(TUTORIAL_PLAYER)),
  );
  const lastRejection = ref<MoveRejection | null>(null);
  const notice = ref<string | null>(null);
  const round = ref(0);
  const showSnapshot = (next: SessionSnapshot) => {
    snapshot.value = next;
  };
  let running = startRunning(showSnapshot);

  const guide = computed(() => {
    const { state, moves } = snapshot.value.log;
    return state.status === "started"
      ? guideFor(moves, state, TUTORIAL_PLAYER.id)
      : null;
  });

  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  const showNotice = (hint: string | null) => {
    clearTimeout(noticeTimer);
    notice.value = hint;
    if (hint !== null) {
      noticeTimer = setTimeout(() => {
        notice.value = null;
      }, NOTICE_MS);
    }
  };

  watch(
    () => snapshot.value.log.moves.length,
    () => {
      lastRejection.value = null;
      showNotice(null);
    },
  );

  const start = () => {
    lastRejection.value = running.player.startGame(
      TUTORIAL_SEED,
      TUTORIAL_DECK,
    );
  };

  onUnmounted(() => {
    clearTimeout(noticeTimer);
    running.stop();
  });

  return {
    snapshot,
    round,
    guide,
    notice,
    lastRejection,
    start,
    restart: () => {
      running.stop();
      round.value += 1;
      running = startRunning(showSnapshot);
      start();
    },
    submitMove: (move: Move) => {
      const hint = guide.value?.hintAgainst(move) ?? null;
      showNotice(hint);
      if (hint === null) {
        lastRejection.value = running.player.submitMove(move);
      }
    },
  };
}
