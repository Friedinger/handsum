import { describe, expect, it } from "vitest";
import { CALLER_PENALTY, SPECIAL_LAYOUT_PENALTY } from "./rules";
import { scoreGame } from "./scoring";
import { createPlayers, makeCard } from "./testFixtures";
import type { Seat, Slot } from "./types";

function seatsWithValues(...layouts: (number | null)[][]): Seat[] {
  const players = createPlayers(layouts.length);
  return layouts.map((values, seatIndex) => ({
    player: players[seatIndex] ?? { id: "missing", name: "missing" },
    layout: values.map((value, slotIndex): Slot =>
      value === null ? null : makeCard(value, null, seatIndex * 10 + slotIndex),
    ),
  }));
}

function scores(seats: Seat[], endCallerId: string | null): number[] {
  return scoreGame(seats, endCallerId).map((result) => result.score);
}

describe("scoreGame", () => {
  it("gives the lowest sum 0 points and everyone else their sum", () => {
    const seats = seatsWithValues([1, 2, 3, 4], [0, 0, 1, 1], [5, 5, 5, 5]);
    expect(scores(seats, "player-2")).toEqual([10, 0, 20]);
    expect(
      scoreGame(seats, "player-2").map((result) => result.isWinner),
    ).toEqual([false, true, false]);
  });

  it("adds the caller penalty when someone has strictly less", () => {
    const seats = seatsWithValues([1, 1, 1, 1], [3, 3, 3, 3]);
    expect(scores(seats, "player-2")).toEqual([0, 12 + CALLER_PENALTY]);
  });

  it("lets the caller win a tie alone", () => {
    const seats = seatsWithValues([2, 2, 2, 2], [4, 4, 0, 0], [9, 9, 9, 9]);
    expect(scores(seats, "player-1")).toEqual([0, 8, 36]);
  });

  it("lets all tied lowest players win when none of them called", () => {
    const seats = seatsWithValues([2, 2, 2, 2], [4, 4, 0, 0], [9, 9, 9, 9]);
    expect(scores(seats, "player-3")).toEqual([0, 0, 36 + CALLER_PENALTY]);
  });

  it("ignores empty slots in the sum", () => {
    const seats = seatsWithValues([13, null, null, null], [5, 5, 5, null]);
    expect(
      scoreGame(seats, "player-1").map((result) => result.cardSum),
    ).toEqual([13, 15]);
  });

  it("lets the special layout 12, 12, 13, 13 win while everyone else gets the flat penalty", () => {
    const seats = seatsWithValues([0, 0, 1, 1], [13, 12, 13, 12], [3, 3, 3, 3]);
    expect(scores(seats, "player-1")).toEqual([
      SPECIAL_LAYOUT_PENALTY,
      0,
      SPECIAL_LAYOUT_PENALTY,
    ]);
  });

  it("requires all four special cards to be present", () => {
    const seats = seatsWithValues([12, 12, 13, null], [10, 10, 10, 10]);
    expect(scores(seats, "player-2")).toEqual([0, 40 + CALLER_PENALTY]);
  });
});
