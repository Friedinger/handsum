import type { HelloMessage, LogMessage, MoveMessage } from "./protocol";

export type PeerId = string;

export interface TransportHandlers {
  readonly onPeerJoin: (peerId: PeerId) => void;
  readonly onPeerLeave: (peerId: PeerId) => void;
  readonly onHello: (hello: HelloMessage, peerId: PeerId) => void;
  readonly onMove: (message: MoveMessage, peerId: PeerId) => void;
  readonly onLog: (log: LogMessage, peerId: PeerId) => void;
  readonly onSyncRequest: (peerId: PeerId) => void;
}

export interface Transport {
  readonly sendHello: (hello: HelloMessage, target: PeerId) => void;
  readonly broadcastMove: (message: MoveMessage) => void;
  readonly sendLog: (log: LogMessage, target: PeerId) => void;
  readonly requestSync: (target: PeerId) => void;
  readonly leave: () => void;
}

export type ConnectTransport = (
  roomCode: string,
  handlers: TransportHandlers,
) => Transport;
