import { onUnmounted, ref, shallowRef, watch } from "vue";
import {
  createGameSession,
  initialSnapshot,
  type SessionSnapshot,
} from "@/net/gameSession";
import type { Move, MoveRejection } from "@/engine";
import type { HelloMessage } from "@/net/protocol";
import { connectPolling } from "@/net/pollingTransport";
import { randomSeed } from "@/ui/randomSeed";

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
