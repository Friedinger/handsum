import { onUnmounted, ref, shallowRef } from "vue";
import type { Move } from "../../engine";
import { createGameSession, initialSnapshot, type SessionSnapshot } from "../../net/gameSession";
import type { SyncRejection } from "../../net/moveLog";
import type { HelloMessage } from "../../net/protocol";
import { connectTrystero } from "../../net/trysteroTransport";

const UINT32_COUNT = 1;

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(UINT32_COUNT))[0] ?? 0;
}

export function useGameSession(roomCode: string, self: HelloMessage) {
  const snapshot = shallowRef<SessionSnapshot>(initialSnapshot(roomCode, self));
  const lastRejection = ref<SyncRejection | null>(null);
  const session = createGameSession({
    roomCode,
    self,
    connect: connectTrystero,
    onChange: (next) => {
      snapshot.value = next;
    },
  });
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
