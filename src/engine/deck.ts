import cardData from "../data/cards.json";
import type { Card, CardAction } from "./types";

export interface CardType {
  readonly value: number;
  readonly count: number;
  readonly points: number;
  readonly action: CardAction | null;
}

const CARD_ACTIONS: readonly CardAction[] = [
  "viewOwn",
  "viewOther",
  "exchangeBlind",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isCardAction(value: unknown): value is CardAction {
  return CARD_ACTIONS.some((action) => action === value);
}

function parseCardType(entry: unknown, index: number): CardType {
  if (!isRecord(entry)) {
    throw new Error(`Card type #${String(index)} must be an object`);
  }
  const { value, count, action } = entry;
  const points = entry.points ?? value;
  if (!isNonNegativeInteger(value) || !isNonNegativeInteger(count)) {
    throw new Error(
      `Card type #${String(index)} needs non-negative integer value and count`,
    );
  }
  if (!isNonNegativeInteger(points)) {
    throw new Error(`Card type #${String(index)} has invalid points`);
  }
  if (action !== null && !isCardAction(action)) {
    throw new Error(`Card type #${String(index)} has unknown action`);
  }
  return { value, count, points, action };
}

export function parseCardTypes(data: unknown): CardType[] {
  if (!isRecord(data) || !Array.isArray(data.cardTypes)) {
    throw new Error("Card data must contain a cardTypes array");
  }
  return data.cardTypes.map(parseCardType);
}

export function buildDeck(cardTypes: readonly CardType[]): Card[] {
  const cardsWithoutIds = cardTypes.flatMap(
    ({ value, count, points, action }) =>
      Array.from({ length: count }, () => ({ value, points, action })),
  );
  return cardsWithoutIds.map((card, id) => ({ id, ...card }));
}

export const standardDeck: readonly Card[] = buildDeck(
  parseCardTypes(cardData),
);
