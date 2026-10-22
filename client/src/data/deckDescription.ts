import type { CardAction } from "@/engine";
import type { CardType } from "@/engine/deck";

export interface DeckWording {
  readonly pair: (first: number, second: number) => string;
  readonly range: (first: number, last: number) => string;
  readonly list: (leading: string, last: string) => string;
  readonly each: (count: number) => string;
  readonly total: (count: number) => string;
  readonly actionName: (action: CardAction) => string;
}

export interface DeckFact {
  readonly values: string;
  readonly detail: string;
}

interface DeckDescription {
  readonly total: string;
  readonly facts: readonly DeckFact[];
}

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

function describeRun(run: readonly number[], wording: DeckWording): string {
  const [first] = run;
  const last = run.at(-1);
  if (first === undefined || last === undefined || first === last) {
    return String(first);
  }
  return run.length === 2
    ? wording.pair(first, last)
    : wording.range(first, last);
}

/**
 * Neighbouring values are collapsed into a range.
 */
export function describeValues(
  values: readonly number[],
  wording: DeckWording,
): string {
  const runs = runsOf([...values].sort((a, b) => a - b)).map((run) =>
    describeRun(run, wording),
  );
  const last = runs.pop();
  if (last === undefined) {
    return "";
  }
  return runs.length === 0 ? last : wording.list(runs.join(", "), last);
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

export function valuesWithPower(
  types: readonly CardType[],
  wording: DeckWording,
): string {
  return describeValues(
    valuesWhere(types, (type) => type.action !== null),
    wording,
  );
}

export function describeDeck(
  types: readonly CardType[],
  wording: DeckWording,
): DeckDescription {
  const total = types.reduce((sum, type) => sum + type.count, 0);
  const countFacts = distinct(types.map((type) => type.count))
    .sort((a, b) => b - a)
    .map((count) => ({
      values: describeValues(
        valuesWhere(types, (type) => type.count === count),
        wording,
      ),
      detail: wording.each(count),
    }));
  const actionFacts = distinct(
    types.flatMap((type) => (type.action ? [type.action] : [])),
  ).map((action) => ({
    values: describeValues(
      valuesWhere(types, (type) => type.action === action),
      wording,
    ),
    detail: wording.actionName(action),
  }));
  return {
    total: wording.total(total),
    facts: [...countFacts, ...actionFacts],
  };
}
