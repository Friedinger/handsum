import cardData from "@/data/cards.json";
import { isRecord } from "@/engine/guards";
import type { Card, CardAction } from "@/engine/types";

export interface CardType {
  readonly value: number;
  readonly count: number;
  readonly points: number;
  readonly action: CardAction | null;
}

const CARD_ACTIONS: Readonly<Record<CardAction, true>> = {
  viewOwn: true,
  viewOther: true,
  exchangeBlind: true,
};

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isCardAction(value: unknown): value is CardAction {
  return typeof value === "string" && Object.hasOwn(CARD_ACTIONS, value);
}

function invalidCardType(index: number, problem: string): Error {
  return new Error(`Card type #${String(index)} ${problem}`);
}

function parseCardType(entry: unknown, index: number): CardType {
  if (!isRecord(entry)) {
    throw invalidCardType(index, "must be an object");
  }
  const { value, count, action } = entry;
  const points = entry.points ?? value;
  if (!isNonNegativeInteger(value) || !isNonNegativeInteger(count)) {
    throw invalidCardType(index, "needs non-negative integer value and count");
  }
  if (!isNonNegativeInteger(points)) {
    throw invalidCardType(index, "has invalid points");
  }
  if (action !== null && !isCardAction(action)) {
    throw invalidCardType(index, "has unknown action");
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
