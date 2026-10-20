import { onUnmounted, ref, shallowRef, watch } from "vue";

import type { Move, MoveRejection } from "@/engine";
import {
  createGameSession,
  initialSnapshot,
  type SessionSnapshot,
} from "@/net/gameSession";
import { connectPolling } from "@/net/pollingTransport";
import type { HelloMessage } from "@/net/protocol";
import { randomSeed } from "@/utils/randomSeed";

export function useGameSession(roomCode: string, self: HelloMessage) {
  const snapshot = shallowRef<SessionSnapshot>(initialSnapshot(roomCode, self));
  const lastRejection = ref<MoveRejection | null>(null);
  const session = createGameSession({
    roomCode,
    self,
    connect: connectPolling,
    onChange: (next) => {
      snapshot.value = next;
    },
  });
  watch(
    () => snapshot.value.log.moves.length,
    () => {
      lastRejection.value = null;
    },
  );
  onUnmounted(() => {
    session.leave();
  });
  return {
    snapshot,
    lastRejection,
    submitMove: (move: Move) => {
      lastRejection.value = session.submitMove(move);
    },
    startGame: () => {
      lastRejection.value = session.startGame(randomSeed());
    },
  };
}
