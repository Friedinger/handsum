import { parseMove, type Move, type PlayerId } from "../engine";

export interface HelloMessage {
  readonly playerId: PlayerId;
  readonly name: string;
  readonly isHost: boolean;
}

export interface MoveMessage {
  readonly sequence: number;
  readonly move: Move;
}

export interface LogMessage {
  readonly moves: readonly Move[];
}

type Fields = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseHello(value: unknown): HelloMessage | null {
  if (!isRecord(value)) {
    return null;
  }
  const { playerId, name, isHost } = value;
  if (typeof playerId !== "string" || typeof name !== "string" || typeof isHost !== "boolean") {
    return null;
  }
  return { playerId, name, isHost };
}

export function parseMoveMessage(value: unknown): MoveMessage | null {
  if (!isRecord(value) || typeof value.sequence !== "number" || !Number.isInteger(value.sequence)) {
    return null;
  }
  const move = parseMove(value.move);
  return move ? { sequence: value.sequence, move } : null;
}

export function parseLog(value: unknown): LogMessage | null {
  if (!isRecord(value) || !Array.isArray(value.moves)) {
    return null;
  }
  const moves = value.moves.map(parseMove);
  return moves.every((move) => move !== null) ? { moves } : null;
}
