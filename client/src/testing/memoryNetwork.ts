import type { Move } from "@/engine";
import type { HelloMessage } from "@/net/protocol";
import type { ConnectTransport } from "@/net/transport";

export interface MemoryNetwork {
  readonly connect: ConnectTransport;
  readonly deliverAll: () => Promise<void>;
}

interface Room {
  readonly moves: Move[];
  readonly players: Map<string, HelloMessage>;
  readonly refreshes: Set<() => Promise<void>>;
}

// In-memory stand-in for the polling transport plus server: moves reach clients on deliverAll.
export function createMemoryNetwork(): MemoryNetwork {
  const rooms = new Map<string, Room>();

  const roomFor = (roomCode: string): Room => {
    const room = rooms.get(roomCode) ?? {
      moves: [],
      players: new Map(),
      refreshes: new Set(),
    };
    rooms.set(roomCode, room);
    return room;
  };

  const connect: ConnectTransport = (roomCode, self, handlers) => {
    const room = roomFor(roomCode);
    let knownLength = 0;
    room.players.set(self.playerId, self);
    handlers.onConnectionChange("online");

    const refresh = () => {
      handlers.onUpdate({
        firstIndex: knownLength,
        moves: room.moves.slice(knownLength),
        players: [...room.players.values()],
      });
      knownLength = room.moves.length;
      return Promise.resolve();
    };
    room.refreshes.add(refresh);

    return {
      appendMove: (sequence, move) => {
        if (sequence !== room.moves.length) {
          return Promise.resolve({ kind: "conflict" });
        }
        room.moves.push(move);
        return Promise.resolve({ kind: "appended" });
      },
      refresh,
      leave: () => {
        room.players.delete(self.playerId);
        room.refreshes.delete(refresh);
      },
    };
  };

  const deliverAll = async () => {
    for (const room of rooms.values()) {
      for (const refresh of room.refreshes) {
        await refresh();
      }
    }
  };

  return { connect, deliverAll };
}
