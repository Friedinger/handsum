import {
  CALLER_PENALTY,
  SPECIAL_LAYOUT_PENALTY,
  SPECIAL_LAYOUT_VALUES,
} from "./rules";
import type { Card, PlayerId, PlayerResult, Seat, Slot } from "./types";

interface Tally {
  readonly playerId: PlayerId;
  readonly cardSum: number;
  readonly hasSpecialLayout: boolean;
}

function occupiedCards(layout: readonly Slot[]): Card[] {
  return layout.filter((slot): slot is Card => slot !== null);
}

function sortedNumbers(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function isSpecialLayout(layout: readonly Slot[]): boolean {
  const values = sortedNumbers(occupiedCards(layout).map((card) => card.value));
  const expected = sortedNumbers(SPECIAL_LAYOUT_VALUES);
  return (
    values.length === expected.length &&
    values.every((value, index) => value === expected[index])
  );
}

function tally(seat: Seat): Tally {
  return {
    playerId: seat.player.id,
    cardSum: occupiedCards(seat.layout).reduce(
      (sum, card) => sum + card.points,
      0,
    ),
    hasSpecialLayout: isSpecialLayout(seat.layout),
  };
}

function winnerResult({ playerId, cardSum }: Tally): PlayerResult {
  return { playerId, cardSum, score: 0, isWinner: true };
}

function loserResult(
  { playerId, cardSum }: Tally,
  score: number,
): PlayerResult {
  return { playerId, cardSum, score, isWinner: false };
}

function scoreSpecialLayout(
  tallies: readonly Tally[],
  holder: Tally,
): PlayerResult[] {
  return tallies.map((entry) =>
    entry === holder
      ? winnerResult(entry)
      : loserResult(entry, SPECIAL_LAYOUT_PENALTY),
  );
}

function scoreBySum(
  tallies: readonly Tally[],
  endCallerId: PlayerId | null,
): PlayerResult[] {
  const lowestSum = Math.min(...tallies.map((entry) => entry.cardSum));
  const caller = tallies.find((entry) => entry.playerId === endCallerId);
  const callerHasLowest = caller?.cardSum === lowestSum;
  const isWinner = (entry: Tally) =>
    callerHasLowest ? entry === caller : entry.cardSum === lowestSum;
  return tallies.map((entry) => {
    if (isWinner(entry)) {
      return winnerResult(entry);
    }
    const penalty = entry === caller ? CALLER_PENALTY : 0;
    return loserResult(entry, entry.cardSum + penalty);
  });
}

export function scoreGame(
  seats: readonly Seat[],
  endCallerId: PlayerId | null,
): PlayerResult[] {
  const tallies = seats.map(tally);
  const specialHolder = tallies.find((entry) => entry.hasSpecialLayout);
  return specialHolder
    ? scoreSpecialLayout(tallies, specialHolder)
    : scoreBySum(tallies, endCallerId);
}
