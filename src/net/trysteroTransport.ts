import { joinRoom } from "trystero";
import { parseHello, parseLog, parseMoveMessage } from "./protocol";
import type { ConnectTransport, PeerId } from "./transport";

const APP_ID = "handsum-friedinger-github-io";

const ACTION_NAMES = {
  hello: "hello",
  move: "move",
  log: "log",
  sync: "sync",
} as const;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function listen<T>(
  parse: (value: unknown) => T | null,
  handle: (message: T, peerId: PeerId) => void,
): (text: string, context: { peerId: PeerId }) => void {
  return (text, { peerId }) => {
    const message = parse(parseJson(text));
    if (message) {
      handle(message, peerId);
    }
  };
}

// Messages travel as JSON strings so the protocol types do not have to match Trystero's JsonValue.
export const connectTrystero: ConnectTransport = (roomCode, handlers) => {
  const room = joinRoom({ appId: APP_ID }, roomCode);
  const hello = room.makeAction<string>(ACTION_NAMES.hello);
  const move = room.makeAction<string>(ACTION_NAMES.move);
  const log = room.makeAction<string>(ACTION_NAMES.log);
  const sync = room.makeAction<string>(ACTION_NAMES.sync);

  room.onPeerJoin = handlers.onPeerJoin;
  room.onPeerLeave = handlers.onPeerLeave;
  hello.onMessage = listen(parseHello, handlers.onHello);
  move.onMessage = listen(parseMoveMessage, handlers.onMove);
  log.onMessage = listen(parseLog, handlers.onLog);
  sync.onMessage = (_, { peerId }) => {
    handlers.onSyncRequest(peerId);
  };

  return {
    sendHello: (message, target) => void hello.send(JSON.stringify(message), { target }),
    broadcastMove: (message) => void move.send(JSON.stringify(message)),
    sendLog: (message, target) => void log.send(JSON.stringify(message), { target }),
    requestSync: (target) => void sync.send("", { target }),
    leave: () => void room.leave(),
  };
};
