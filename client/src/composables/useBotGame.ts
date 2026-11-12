import { onUnmounted, ref, shallowRef, watch } from "vue";

import { createBotPlanner } from "@/composables/botPlanner";
import type { Move, MoveRejection, Player } from "@/engine";
import {
  createGameSession,
  initialSnapshot,
  type SessionSnapshot,
} from "@/net/gameSession";
import { createLocalRoom } from "@/net/localTransport";
import type { ConnectTransport } from "@/net/transport";
import { nextBotMove } from "@/utils/bot";
import { randomSeed } from "@/utils/randomSeed";
import { DEV_ROOM_CODE } from "@/utils/roomNavigation";

function helloOf({ id, name }: Player) {
  return { playerId: id, name };
}

interface BotGameOptions {
  /** The first player is the person at the screen, everyone after them is a bot. */
  readonly players: readonly Player[];
  readonly delayMs: number;
}

/**
 * An offline game in a room that lives in memory, with bots in every seat but the first. The bots
 * announce the end once they know all their cards, or at their next chance when asked to.
 */
export function useBotGame({ players, delayMs }: BotGameOptions) {
  const [self, ...bots] = players;
  if (!self) {
    throw new Error("A bot game needs a player");
  }
  const connect: ConnectTransport = createLocalRoom();
  const snapshot = shallowRef<SessionSnapshot>(
    initialSnapshot(DEV_ROOM_CODE, helloOf(self)),
  );
  const lastRejection = ref<MoveRejection | null>(null);
  const endRequested = ref(false);
  let stopped = false;

  const player = createGameSession({
    roomCode: DEV_ROOM_CODE,
    self: helloOf(self),
    connect,
    onChange: (next) => {
      if (!stopped) {
        snapshot.value = next;
      }
    },
  });

  const joinBot = (bot: Player) => {
    const planner = createBotPlanner({
      nextMove: ({ log }) =>
        log.state.status === "started"
          ? nextBotMove(
              log.state,
              log.moves,
              bot.id,
              endRequested.value ? "now" : "whenAllKnown",
            )
          : null,
      submit: (move) => {
        session.submitMove(move);
      },
      delayMs,
    });
    const session = createGameSession({
      roomCode: DEV_ROOM_CODE,
      self: helloOf(bot),
      connect,
      onChange: (next) => {
        if (!stopped) {
          planner.plan(next);
        }
      },
    });
    return {
      stop: () => {
        planner.cancel();
        session.leave();
      },
    };
  };
  const botSessions = bots.map(joinBot);

  watch(
    () => {
      const { state } = snapshot.value.log;
      return state.status === "started" ? state.endCallerId : null;
    },
    (endCallerId) => {
      if (endCallerId !== null) {
        endRequested.value = false;
      }
    },
  );
  watch(
    () => snapshot.value.log.moves.length,
    () => {
      lastRejection.value = null;
    },
  );

  const startRound = () => {
    lastRejection.value = player.startGame(randomSeed());
  };
  startRound();

  onUnmounted(() => {
    stopped = true;
    botSessions.forEach((bot) => {
      bot.stop();
    });
    player.leave();
  });

  return {
    snapshot,
    lastRejection,
    endRequested,
    submitMove: (move: Move) => {
      lastRejection.value = player.submitMove(move);
    },
    playAgain: startRound,
    requestEnd: () => {
      endRequested.value = true;
    },
  };
}
