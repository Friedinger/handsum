import type { Move } from "@/engine";
import {
  parsePlayers,
  parseRoomSnapshot,
  type HelloMessage,
  type RoomSnapshot,
} from "@/net/protocol";
import { hashRoomCode } from "@/net/roomCode";
import type {
  AppendResult,
  ConnectionState,
  ConnectTransport,
  Transport,
} from "@/net/transport";

const API_URL = "api/index.php";
const ACTIVE_POLL_MS = 1500;
const QUIET_AFTER_MS = 30_000;
const QUIET_POLL_MS = 4000;
const IDLE_AFTER_MS = 120_000;
const IDLE_POLL_MS = 10_000;
const FIRST_RETRY_MS = 2000;
const MAX_RETRY_MS = 30_000;
const PRESENCE_INTERVAL_MS = 30_000;
const FAILURES_BEFORE_OFFLINE = 2;

const STATUS_OK = 200;
const STATUS_CONFLICT = 409;
const STATUS_TOO_MANY_REQUESTS = 429;
const STATUS_SERVER_ERROR_FROM = 500;
const ROOM_HEADER = "X-Room";
const JOIN_QUERY = "?action=join";
const MOVE_QUERY = "?action=move";

export interface PageVisibility {
  readonly hidden: boolean;
  readonly addEventListener: (
    type: "visibilitychange",
    listener: () => void,
  ) => void;
  readonly removeEventListener: (
    type: "visibilitychange",
    listener: () => void,
  ) => void;
}

export interface PollingOptions {
  readonly fetch: typeof fetch;
  readonly page: PageVisibility;
  readonly apiUrl?: string;
}

interface Reply {
  readonly status: number;
  readonly body: unknown;
}

export function pollDelay(failures: number, quietMs: number): number {
  if (failures > 0) {
    return Math.min(FIRST_RETRY_MS * 2 ** (failures - 1), MAX_RETRY_MS);
  }
  if (quietMs < QUIET_AFTER_MS) {
    return ACTIVE_POLL_MS;
  }
  return quietMs < IDLE_AFTER_MS ? QUIET_POLL_MS : IDLE_POLL_MS;
}

export function createPollingTransport(
  options: PollingOptions,
): ConnectTransport {
  const apiUrl = options.apiUrl ?? API_URL;

  return (roomCode, self, handlers) => {
    const roomId = hashRoomCode(roomCode);
    let knownLength = 0;
    let knownPlayers = "";
    let lastChangeAt = Date.now();
    let lastPresenceAt = Number.NEGATIVE_INFINITY;
    let failures = 0;
    let connection: ConnectionState = "connecting";
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let queue: Promise<unknown> = Promise.resolve();

    const setConnection = (next: ConnectionState) => {
      if (next !== connection) {
        connection = next;
        handlers.onConnectionChange(next);
      }
    };

    const send = async (
      query: string,
      method: "GET" | "POST",
      body?: unknown,
    ): Promise<Reply> => {
      try {
        const response = await options.fetch(`${apiUrl}${query}`, {
          method,
          cache: "no-store",
          headers: { [ROOM_HEADER]: await roomId },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const parsed: unknown = await response.json().catch(() => null);
        if (
          response.status >= STATUS_SERVER_ERROR_FROM ||
          response.status === STATUS_TOO_MANY_REQUESTS
        ) {
          throw new Error("Server unavailable");
        }
        failures = 0;
        setConnection("online");
        return { status: response.status, body: parsed };
      } catch (error) {
        failures += 1;
        if (failures >= FAILURES_BEFORE_OFFLINE) {
          setConnection("offline");
        }
        throw error;
      }
    };

    const deliver = (
      snapshot: RoomSnapshot | null,
      players: readonly HelloMessage[],
    ) => {
      const firstIndex = knownLength;
      const moves = snapshot?.moves ?? [];
      const playersKey = JSON.stringify(players);
      if (moves.length === 0 && playersKey === knownPlayers) {
        return;
      }
      knownLength += moves.length;
      knownPlayers = playersKey;
      if (moves.length > 0) {
        lastChangeAt = Date.now();
      }
      handlers.onUpdate({ firstIndex, moves, players });
    };

    const announce = async () => {
      lastPresenceAt = Date.now();
      const reply = await send(JOIN_QUERY, "POST", self);
      const players = parsePlayers(reply.body);
      if (players) {
        deliver(null, players);
      }
    };

    const read = async () => {
      const reply = await send(`?since=${String(knownLength)}`, "GET");
      const snapshot = parseRoomSnapshot(reply.body);
      if (!snapshot) {
        return;
      }
      if (snapshot.length < knownLength) {
        knownLength = 0;
        return;
      }
      deliver(snapshot, snapshot.players);
    };

    const cycle = async () => {
      if (Date.now() - lastPresenceAt >= PRESENCE_INTERVAL_MS) {
        await announce();
      }
      await read();
    };

    const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
      const result = queue.then(task, task);
      queue = result.catch(() => undefined);
      return result;
    };

    const schedule = () => {
      clearTimeout(timer);
      if (stopped || options.page.hidden) {
        return;
      }
      const delay = pollDelay(failures, Date.now() - lastChangeAt);
      timer = setTimeout(() => {
        void pollOnce();
      }, delay);
    };

    const pollOnce = async () => {
      await enqueue(cycle).catch(() => undefined);
      schedule();
    };

    const onVisibilityChange = () => {
      if (options.page.hidden) {
        clearTimeout(timer);
        return;
      }
      lastPresenceAt = Number.NEGATIVE_INFINITY;
      void pollOnce();
    };
    options.page.addEventListener("visibilitychange", onVisibilityChange);
    void pollOnce();

    const appendMove = async (
      sequence: number,
      move: Move,
    ): Promise<AppendResult> => {
      const reply = await enqueue(() =>
        send(MOVE_QUERY, "POST", { sequence, move }),
      ).catch(() => null);
      if (reply?.status === STATUS_CONFLICT) {
        return { kind: "conflict" };
      }
      if (reply?.status !== STATUS_OK) {
        return { kind: "failed" };
      }
      if (sequence === knownLength) {
        knownLength += 1;
      }
      lastChangeAt = Date.now();
      schedule();
      return { kind: "appended" };
    };

    const transport: Transport = {
      appendMove,
      refresh: () => enqueue(read).catch(() => undefined),
      leave: () => {
        stopped = true;
        clearTimeout(timer);
        options.page.removeEventListener(
          "visibilitychange",
          onVisibilityChange,
        );
      },
    };
    return transport;
  };
}

export const connectPolling: ConnectTransport = (roomCode, self, handlers) =>
  createPollingTransport({
    fetch: (input, init) => fetch(input, init),
    page: document,
  })(roomCode, self, handlers);
