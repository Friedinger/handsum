import type { Move, Player, PlayerId } from "../engine";
import {
  appendMove,
  chooseLog,
  emptyLog,
  receiveMove,
  startSeedOf,
  type SyncRejection,
  type SyncedLog,
} from "./moveLog";
import type { HelloMessage, MoveMessage } from "./protocol";
import type {
  ConnectTransport,
  PeerId,
  Transport,
  TransportHandlers,
} from "./transport";

export interface ConnectedPeer {
  readonly peerId: PeerId;
  readonly hello: HelloMessage;
}

export interface SessionSnapshot {
  readonly roomCode: string;
  readonly self: HelloMessage;
  readonly peers: readonly ConnectedPeer[];
  readonly log: SyncedLog;
}

export interface GameSession {
  readonly submitMove: (move: Move) => SyncRejection | null;
  readonly startGame: (seed: number) => SyncRejection | null;
  readonly leave: () => void;
}

interface SessionOptions {
  readonly roomCode: string;
  readonly self: HelloMessage;
  readonly connect: ConnectTransport;
  readonly onChange: (snapshot: SessionSnapshot) => void;
}

export function initialSnapshot(
  roomCode: string,
  self: HelloMessage,
): SessionSnapshot {
  return { roomCode, self, peers: [], log: emptyLog };
}

export function lobbyPlayers(snapshot: SessionSnapshot): Player[] {
  const everyone = [snapshot.self, ...snapshot.peers.map((peer) => peer.hello)];
  const unique = everyone.filter(
    (hello, index) =>
      everyone.findIndex((other) => other.playerId === hello.playerId) ===
      index,
  );
  return unique.map(({ playerId, name }) => ({ id: playerId, name }));
}

// A rematch keeps the players of the finished game; a first start takes everyone in the lobby.
function playersForStart(snapshot: SessionSnapshot): Player[] {
  const { state } = snapshot.log;
  return state.status === "started"
    ? state.seats.map((seat) => seat.player)
    : lobbyPlayers(snapshot);
}

export function onlinePlayerIds(
  snapshot: SessionSnapshot,
): ReadonlySet<PlayerId> {
  return new Set([
    snapshot.self.playerId,
    ...snapshot.peers.map((peer) => peer.hello.playerId),
  ]);
}

function withPeer(
  peers: readonly ConnectedPeer[],
  peer: ConnectedPeer,
): ConnectedPeer[] {
  // A reloaded player reconnects with a new peer ID; the stale connection is replaced.
  const others = peers.filter(
    (existing) =>
      existing.peerId !== peer.peerId &&
      existing.hello.playerId !== peer.hello.playerId,
  );
  return [...others, peer];
}

export function createGameSession(options: SessionOptions): GameSession {
  let snapshot = initialSnapshot(options.roomCode, options.self);

  const update = (changes: Partial<SessionSnapshot>) => {
    snapshot = { ...snapshot, ...changes };
    options.onChange(snapshot);
  };

  const senderOf = (peerId: PeerId) =>
    snapshot.peers.find((peer) => peer.peerId === peerId)?.hello;

  let transport: Transport | null = null;
  const send = (action: (connected: Transport) => void) => {
    if (transport) {
      action(transport);
    }
  };

  const handlers: TransportHandlers = {
    onPeerJoin: (peerId) => {
      send((connected) => {
        connected.sendHello(snapshot.self, peerId);
        if (snapshot.log.moves.length > 0) {
          connected.sendLog({ moves: snapshot.log.moves }, peerId);
        }
      });
    },
    onPeerLeave: (peerId) => {
      update({
        peers: snapshot.peers.filter((peer) => peer.peerId !== peerId),
      });
    },
    onHello: (hello, peerId) => {
      update({ peers: withPeer(snapshot.peers, { peerId, hello }) });
    },
    onMove: (message: MoveMessage, peerId) => {
      const sender = senderOf(peerId);
      if (!sender) {
        return;
      }
      const outcome = receiveMove(snapshot.log, message, sender);
      if (outcome.kind === "accepted") {
        update({ log: outcome.log });
      } else if (outcome.kind === "behind") {
        send((connected) => {
          connected.requestSync(peerId);
        });
      }
    },
    onLog: ({ moves }) => {
      const adopted = chooseLog(snapshot.log, moves);
      if (adopted) {
        update({ log: adopted });
      }
    },
    onSyncRequest: (peerId) => {
      send((connected) => {
        connected.sendLog({ moves: snapshot.log.moves }, peerId);
      });
    },
  };

  transport = options.connect(options.roomCode, handlers);
  options.onChange(snapshot);

  const submitMove = (move: Move): SyncRejection | null => {
    const outcome = appendMove(snapshot.log, move);
    if (outcome.kind !== "accepted") {
      return outcome.kind === "rejected" ? outcome.reason : null;
    }
    const { log } = outcome;
    update({ log });
    send((connected) => {
      connected.broadcastMove({
        startSeed: startSeedOf(log.moves) ?? 0,
        sequence: log.moves.length,
        move,
      });
    });
    return null;
  };

  return {
    submitMove,
    startGame: (seed) => {
      const players = playersForStart(snapshot);
      return submitMove({
        type: "startGame",
        playerId: snapshot.self.playerId,
        players,
        seed,
      });
    },
    leave: () => {
      send((connected) => {
        connected.leave();
      });
      transport = null;
    },
  };
}
