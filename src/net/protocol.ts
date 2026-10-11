import { parseMove, type Move, type PlayerId } from "@/engine";

export interface HelloMessage {
  readonly playerId: PlayerId;
  readonly name: string;
}

export interface MoveMessage {
  readonly startSeed: number;
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
  const { playerId, name } = value;
  if (typeof playerId !== "string" || typeof name !== "string") {
    return null;
  }
  return { playerId, name };
}

export function parseMoveMessage(value: unknown): MoveMessage | null {
  if (!isRecord(value)) {
    return null;
  }
  const { startSeed, sequence } = value;
  if (
    typeof startSeed !== "number" ||
    typeof sequence !== "number" ||
    !Number.isInteger(sequence)
  ) {
    return null;
  }
  const move = parseMove(value.move);
  return move ? { startSeed, sequence, move } : null;
}

export function parseLog(value: unknown): LogMessage | null {
  if (!isRecord(value) || !Array.isArray(value.moves)) {
    return null;
  }
  const moves = value.moves.map(parseMove);
  return moves.every((move) => move !== null) ? { moves } : null;
}
