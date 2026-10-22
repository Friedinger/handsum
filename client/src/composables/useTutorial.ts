import { computed, onUnmounted, ref, shallowRef, watch } from "vue";

import type { Move, MoveRejection } from "@/engine";
import {
  createGameSession,
  type GameSession,
  initialSnapshot,
  type SessionSnapshot,
} from "@/net/gameSession";
import { createLocalRoom } from "@/net/localTransport";
import { guideFor } from "@/utils/tutorialGuide";
import {
  nextOpponentMove,
  TUTORIAL_DECK,
  TUTORIAL_OPPONENT,
  TUTORIAL_PLAYER,
  TUTORIAL_ROOM_CODE,
  TUTORIAL_SEED,
} from "@/utils/tutorialScript";

export const OPPONENT_MOVE_DELAY_MS = 1200;
export const NOTICE_MS = 5000;

const PLAYER_HELLO = {
  playerId: TUTORIAL_PLAYER.id,
  name: TUTORIAL_PLAYER.name,
};
const OPPONENT_HELLO = {
  playerId: TUTORIAL_OPPONENT.id,
  name: TUTORIAL_OPPONENT.name,
};

interface RunningTutorial {
  readonly player: GameSession;
  readonly stop: () => void;
}

function startRunning(
  onPlayerChange: (snapshot: SessionSnapshot) => void,
): RunningTutorial {
  const connect = createLocalRoom();
  let stopped = false;
  let opponentTimer: ReturnType<typeof setTimeout> | undefined;
  let plannedAtMoveCount: number | null = null;

  const planOpponentMove = (snapshot: SessionSnapshot) => {
    const { state, moves } = snapshot.log;
    const move =
      state.status === "started" ? nextOpponentMove(state, moves) : null;
    if (!move || state.status !== "started") {
      clearTimeout(opponentTimer);
      plannedAtMoveCount = null;
      return;
    }
    if (plannedAtMoveCount === state.moveCount) {
      return;
    }
    clearTimeout(opponentTimer);
    plannedAtMoveCount = state.moveCount;
    opponentTimer = setTimeout(() => {
      opponent.submitMove(move);
    }, OPPONENT_MOVE_DELAY_MS);
  };

  const player = createGameSession({
    roomCode: TUTORIAL_ROOM_CODE,
    self: PLAYER_HELLO,
    connect,
    onChange: (next) => {
      if (!stopped) {
        onPlayerChange(next);
      }
    },
  });
  const opponent = createGameSession({
    roomCode: TUTORIAL_ROOM_CODE,
    self: OPPONENT_HELLO,
    connect,
    onChange: (next) => {
      if (!stopped) {
        planOpponentMove(next);
      }
    },
  });

  return {
    player,
    stop: () => {
      stopped = true;
      clearTimeout(opponentTimer);
      opponent.leave();
      player.leave();
    },
  };
}

export function useTutorial() {
  const snapshot = shallowRef<SessionSnapshot>(
    initialSnapshot(TUTORIAL_ROOM_CODE, PLAYER_HELLO),
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
      ? guideFor(moves, state, PLAYER_HELLO.playerId)
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
