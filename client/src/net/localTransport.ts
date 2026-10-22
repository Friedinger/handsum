import type { Move } from "@/engine";
import type { HelloMessage } from "@/net/protocol";
import type { ConnectTransport, TransportHandlers } from "@/net/transport";

interface Participant {
  readonly self: HelloMessage;
  readonly handlers: TransportHandlers;
  knownLength: number;
}

/**
 * A room that lives in memory only, for playing without a server. It orders moves like the server
 * does, so sessions connected to it behave exactly as they do online.
 */
export function createLocalRoom(): ConnectTransport {
  const moves: Move[] = [];
  const participants = new Set<Participant>();

  const notify = (participant: Participant) => {
    const { handlers, knownLength } = participant;
    handlers.onUpdate({
      firstIndex: knownLength,
      moves: moves.slice(knownLength),
      players: [...participants].map(({ self }) => self),
    });
    participant.knownLength = moves.length;
  };

  const notifyAll = () => {
    participants.forEach(notify);
  };

  return (_roomCode, self, handlers) => {
    const participant: Participant = { self, handlers, knownLength: 0 };
    participants.add(participant);
    handlers.onConnectionChange("online");
    notifyAll();

    return {
      appendMove: (sequence, move) => {
        if (sequence !== moves.length) {
          return Promise.resolve({ kind: "conflict" });
        }
        moves.push(move);
        queueMicrotask(notifyAll);
        return Promise.resolve({ kind: "appended" });
      },
      refresh: () => {
        notify(participant);
        return Promise.resolve();
      },
      leave: () => {
        participants.delete(participant);
      },
    };
  };
}
