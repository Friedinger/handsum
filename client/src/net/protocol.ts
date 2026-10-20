import { type Move, parseMove, type PlayerId } from "@/engine";
import { isRecord } from "@/engine/guards";

export interface HelloMessage {
  readonly playerId: PlayerId;
  readonly name: string;
}

export interface RoomSnapshot {
  readonly length: number;
  readonly moves: readonly Move[];
  readonly players: readonly HelloMessage[];
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

function parseAll<T>(
  values: unknown,
  parse: (value: unknown) => T | null,
): T[] | null {
  if (!Array.isArray(values)) {
    return null;
  }
  const parsed = values.map((item: unknown) => parse(item));
  return parsed.every((item) => item !== null) ? parsed : null;
}

export function parsePlayers(value: unknown): HelloMessage[] | null {
  return isRecord(value) ? parseAll(value.players, parseHello) : null;
}

export function parseRoomSnapshot(value: unknown): RoomSnapshot | null {
  if (!isRecord(value) || typeof value.length !== "number") {
    return null;
  }
  const moves = parseAll(value.moves, parseMove);
  const players = parsePlayers(value);
  return moves && players ? { length: value.length, moves, players } : null;
}
