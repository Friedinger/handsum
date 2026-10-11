import type {
  ConnectTransport,
  PeerId,
  TransportHandlers,
} from "@/net/transport";

export interface MemoryNetwork {
  readonly connect: ConnectTransport;
  readonly deliverAll: () => void;
}

// In-memory stand-in for Trystero so session behaviour can be tested without WebRTC.
export function createMemoryNetwork(): MemoryNetwork {
  const rooms = new Map<string, Map<PeerId, TransportHandlers>>();
  const pending: (() => void)[] = [];
  let peerCounter = 0;

  const connect: ConnectTransport = (roomCode, handlers) => {
    peerCounter += 1;
    const peerId = `peer-${String(peerCounter)}`;
    const members = rooms.get(roomCode) ?? new Map<PeerId, TransportHandlers>();
    rooms.set(roomCode, members);

    const deliver = (
      target: PeerId,
      receive: (handlers: TransportHandlers) => void,
    ) => {
      pending.push(() => {
        const targetHandlers = members.get(target);
        if (targetHandlers) {
          receive(targetHandlers);
        }
      });
    };
    const others = () =>
      [...members.keys()].filter((memberId) => memberId !== peerId);

    for (const otherId of others()) {
      deliver(otherId, (other) => {
        other.onPeerJoin(peerId);
      });
      pending.push(() => {
        handlers.onPeerJoin(otherId);
      });
    }
    members.set(peerId, handlers);

    return {
      sendHello: (hello, target) => {
        deliver(target, (other) => {
          other.onHello(hello, peerId);
        });
      },
      broadcastMove: (message) => {
        for (const otherId of others()) {
          deliver(otherId, (other) => {
            other.onMove(message, peerId);
          });
        }
      },
      sendLog: (log, target) => {
        deliver(target, (other) => {
          other.onLog(log, peerId);
        });
      },
      requestSync: (target) => {
        deliver(target, (other) => {
          other.onSyncRequest(peerId);
        });
      },
      leave: () => {
        members.delete(peerId);
        for (const otherId of others()) {
          deliver(otherId, (other) => {
            other.onPeerLeave(peerId);
          });
        }
      },
    };
  };

  const deliverAll = () => {
    for (let next = pending.shift(); next; next = pending.shift()) {
      next();
    }
  };

  return { connect, deliverAll };
}
