import type { Move, MoveRejection, Player, PlayerId } from "@/engine";
import { appendMove, emptyLog, extendLog, type SyncedLog } from "@/net/moveLog";
import type { HelloMessage } from "@/net/protocol";
import type {
  ConnectionState,
  ConnectTransport,
  Transport,
  TransportHandlers,
} from "@/net/transport";

const MAX_CONFLICT_RETRIES = 3;

export interface SessionSnapshot {
  readonly roomCode: string;
  readonly self: HelloMessage;
  readonly players: readonly HelloMessage[];
  readonly log: SyncedLog;
  readonly connection: ConnectionState;
  readonly joinRefused: boolean;
}

export interface GameSession {
  readonly submitMove: (move: Move) => MoveRejection | null;
  readonly startGame: (seed: number) => MoveRejection | null;
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
  return {
    roomCode,
    self,
    players: [],
    log: emptyLog,
    connection: "connecting",
    joinRefused: false,
  };
}

export function lobbyPlayers(snapshot: SessionSnapshot): Player[] {
  const everyone = snapshot.players.some(
    (player) => player.playerId === snapshot.self.playerId,
  )
    ? snapshot.players
    : [...snapshot.players, snapshot.self];
  return everyone.map(({ playerId, name }) => ({ id: playerId, name }));
}

/**
 * A rematch keeps the players of the finished game; a first start takes everyone in the lobby.
 */
function playersForStart(snapshot: SessionSnapshot): Player[] {
  const { state } = snapshot.log;
  return state.status === "started"
    ? state.seats.map((seat) => seat.player)
    : lobbyPlayers(snapshot);
}

export function onlinePlayerIds(
  snapshot: SessionSnapshot,
): ReadonlySet<PlayerId> {
  return new Set(lobbyPlayers(snapshot).map((player) => player.id));
}

export function createGameSession(options: SessionOptions): GameSession {
  let snapshot = initialSnapshot(options.roomCode, options.self);

  const update = (changes: Partial<SessionSnapshot>) => {
    snapshot = { ...snapshot, ...changes };
    options.onChange(snapshot);
  };

  const applyMoves = (firstIndex: number, moves: readonly Move[]) => {
    const log = extendLog(snapshot.log, firstIndex, moves);
    if (log !== snapshot.log) {
      update({ log });
    }
  };

  const handlers: TransportHandlers = {
    onUpdate: ({ firstIndex, moves, players }) => {
      update({ players });
      applyMoves(firstIndex, moves);
    },
    onConnectionChange: (connection) => {
      update({ connection });
    },
    onJoinRefusedChange: (joinRefused) => {
      update({ joinRefused });
    },
  };

  /**
   * Moves are only applied once the server has accepted them. If another player got in first,
   * the move is checked again against the newer log and dropped if it is no longer legal.
   */
  const deliver = async (
    transport: Transport,
    move: Move,
    retriesLeft: number,
  ): Promise<void> => {
    const outcome = appendMove(snapshot.log, move);
    if (outcome.kind !== "accepted") {
      return;
    }
    const sequence = snapshot.log.moves.length;
    const result = await transport.appendMove(sequence, move);
    if (result.kind === "appended") {
      applyMoves(sequence, [move]);
    } else if (result.kind === "conflict" && retriesLeft > 0) {
      await transport.refresh();
      await deliver(transport, move, retriesLeft - 1);
    }
  };

  const transport = options.connect(options.roomCode, options.self, handlers);
  options.onChange(snapshot);

  const submitMove = (move: Move): MoveRejection | null => {
    const outcome = appendMove(snapshot.log, move);
    if (outcome.kind === "rejected") {
      return outcome.reason;
    }
    void deliver(transport, move, MAX_CONFLICT_RETRIES);
    return null;
  };

  return {
    submitMove,
    startGame: (seed) =>
      submitMove({
        type: "startGame",
        playerId: snapshot.self.playerId,
        players: playersForStart(snapshot),
        seed,
      }),
    leave: transport.leave,
  };
}
