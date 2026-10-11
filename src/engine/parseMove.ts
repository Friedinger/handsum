import type { Move, MoveType } from "./moves";
import type { Player } from "./types";

type Fields = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber);
}

function isPlayer(value: unknown): value is Player {
  return isRecord(value) && isString(value.id) && isString(value.name);
}

function parsePlayers(value: unknown): Player[] | null {
  if (!Array.isArray(value) || !value.every(isPlayer)) {
    return null;
  }
  return value.map(({ id, name }) => ({ id, name }));
}

function parseFields(type: MoveType, playerId: string, fields: Fields): Move | null {
  switch (type) {
    case "startGame": {
      const players = parsePlayers(fields.players);
      return players && isNumber(fields.seed)
        ? { type, playerId, players, seed: fields.seed }
        : null;
    }
    case "drawFromDeck":
    case "discardDrawnCard":
    case "callEnd":
      return { type, playerId };
    case "viewStartingCards":
    case "swapDrawnCard":
    case "swapDiscardCard":
      return isNumberArray(fields.slotIndices)
        ? { type, playerId, slotIndices: fields.slotIndices }
        : null;
    case "viewOwnCard":
      return isNumber(fields.slotIndex) ? { type, playerId, slotIndex: fields.slotIndex } : null;
    case "viewOtherCard":
      return isString(fields.targetPlayerId) && isNumber(fields.slotIndex)
        ? { type, playerId, targetPlayerId: fields.targetPlayerId, slotIndex: fields.slotIndex }
        : null;
    case "exchangeBlind":
      return isNumber(fields.ownSlotIndex) &&
        isString(fields.targetPlayerId) &&
        isNumber(fields.targetSlotIndex)
        ? {
            type,
            playerId,
            ownSlotIndex: fields.ownSlotIndex,
            targetPlayerId: fields.targetPlayerId,
            targetSlotIndex: fields.targetSlotIndex,
          }
        : null;
  }
}

const MOVE_TYPES: readonly MoveType[] = [
  "startGame",
  "viewStartingCards",
  "drawFromDeck",
  "discardDrawnCard",
  "swapDrawnCard",
  "swapDiscardCard",
  "viewOwnCard",
  "viewOtherCard",
  "exchangeBlind",
  "callEnd",
];

function isMoveType(value: unknown): value is MoveType {
  return MOVE_TYPES.some((type) => type === value);
}

export function parseMove(value: unknown): Move | null {
  if (!isRecord(value) || !isMoveType(value.type) || !isString(value.playerId)) {
    return null;
  }
  return parseFields(value.type, value.playerId, value);
}
