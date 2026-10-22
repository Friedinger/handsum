import cardData from "@/data/cards.json";
import { cardActionNames } from "@/data/strings/cardActions";
import type { CardAction } from "@/engine";
import { type CardType, parseCardTypes } from "@/engine/deck";

const cardTypes = parseCardTypes(cardData);

function runsOf(values: readonly number[]): number[][] {
  return values.reduce<number[][]>((runs, value) => {
    const lastRun = runs.at(-1);
    if (lastRun?.at(-1) === value - 1) {
      lastRun.push(value);
    } else {
      runs.push([value]);
    }
    return runs;
  }, []);
}

function describeRun(run: readonly number[]): string {
  const [first] = run;
  const last = run.at(-1);
  if (first === undefined || last === undefined || first === last) {
    return String(first);
  }
  return run.length === 2
    ? `${String(first)} and ${String(last)}`
    : `${String(first)} to ${String(last)}`;
}

/**
 * Neighbouring values are collapsed, so "7, 8, 9" reads "7 to 9".
 */
export function describeValues(values: readonly number[]): string {
  const runs = runsOf([...values].sort((a, b) => a - b)).map(describeRun);
  const last = runs.pop();
  return runs.length === 0
    ? (last ?? "")
    : `${runs.join(", ")} and ${last ?? ""}`;
}

function valuesWhere(
  types: readonly CardType[],
  matches: (type: CardType) => boolean,
): number[] {
  return types.filter(matches).map((type) => type.value);
}

function distinct<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export interface DeckFact {
  readonly values: string;
  readonly detail: string;
}

export interface DeckDescription {
  readonly total: string;
  readonly facts: readonly DeckFact[];
}

export function describeDeck(types: readonly CardType[]): DeckDescription {
  const total = types.reduce((sum, type) => sum + type.count, 0);
  const countFacts = distinct(types.map((type) => type.count))
    .sort((a, b) => b - a)
    .map((count) => ({
      values: describeValues(
        valuesWhere(types, (type) => type.count === count),
      ),
      detail: `${String(count)} each`,
    }));
  const actionFacts = distinct(
    types.flatMap((type) => (type.action ? [type.action] : [])),
  ).map((action: CardAction) => ({
    values: describeValues(
      valuesWhere(types, (type) => type.action === action),
    ),
    detail: cardActionNames[action],
  }));
  return {
    total: `${String(total)} cards in total.`,
    facts: [...countFacts, ...actionFacts],
  };
}

export const deckOverview = describeDeck(cardTypes);

export const lowestCardValue = Math.min(...cardTypes.map((type) => type.value));
export const highestCardValue = Math.max(
  ...cardTypes.map((type) => type.value),
);
export const powerValues = describeValues(
  valuesWhere(cardTypes, (type) => type.action !== null),
);
