import { isNumber, isRecord, isString, type Fields } from "@/engine/guards";
import type { Move, MoveType } from "@/engine/moves/types";
import type { Player } from "@/engine/types";

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

function parseFields(
  type: MoveType,
  playerId: string,
  fields: Fields,
): Move | null {
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
      return isNumber(fields.slotIndex)
        ? { type, playerId, slotIndex: fields.slotIndex }
        : null;
    case "viewOtherCard":
      return isString(fields.targetPlayerId) && isNumber(fields.slotIndex)
        ? {
            type,
            playerId,
            targetPlayerId: fields.targetPlayerId,
            slotIndex: fields.slotIndex,
          }
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

const MOVE_TYPES: Readonly<Record<MoveType, true>> = {
  startGame: true,
  viewStartingCards: true,
  drawFromDeck: true,
  discardDrawnCard: true,
  swapDrawnCard: true,
  swapDiscardCard: true,
  viewOwnCard: true,
  viewOtherCard: true,
  exchangeBlind: true,
  callEnd: true,
};

function isMoveType(value: unknown): value is MoveType {
  return isString(value) && Object.hasOwn(MOVE_TYPES, value);
}

export function parseMove(value: unknown): Move | null {
  if (
    !isRecord(value) ||
    !isMoveType(value.type) ||
    !isString(value.playerId)
  ) {
    return null;
  }
  return parseFields(value.type, value.playerId, value);
}
