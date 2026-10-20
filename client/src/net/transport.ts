import type { Move } from "@/engine";
import type { HelloMessage } from "@/net/protocol";

export type ConnectionState = "connecting" | "online" | "offline";

export interface RoomUpdate {
  readonly firstIndex: number;
  readonly moves: readonly Move[];
  readonly players: readonly HelloMessage[];
}

export interface TransportHandlers {
  readonly onUpdate: (update: RoomUpdate) => void;
  readonly onConnectionChange: (state: ConnectionState) => void;
  readonly onJoinRefusedChange: (refused: boolean) => void;
}

export type AppendResult =
  | { readonly kind: "appended" }
  | { readonly kind: "conflict" }
  | { readonly kind: "failed" };

export interface Transport {
  readonly appendMove: (sequence: number, move: Move) => Promise<AppendResult>;
  readonly refresh: () => Promise<void>;
  readonly leave: () => void;
}

export type ConnectTransport = (
  roomCode: string,
  self: HelloMessage,
  handlers: TransportHandlers,
) => Transport;
