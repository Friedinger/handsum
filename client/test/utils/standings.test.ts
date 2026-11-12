import { describe, expect, it } from "vitest";

import type { PlayerResult } from "@/engine";
import { roomStandings } from "@/utils/standings";

function result(playerId: string, score: number): PlayerResult {
  return { playerId, cardSum: score, score, isWinner: score === 0 };
}

describe("roomStandings", () => {
  it("is empty before any round has finished", () => {
    expect(roomStandings([])).toEqual([]);
  });

  it("adds up the points and wins of every round", () => {
    const standings = roomStandings([
      [result("alice", 0), result("bob", 12)],
      [result("alice", 7), result("bob", 0)],
      [result("alice", 0), result("bob", 3)],
    ]);

    expect(standings).toEqual([
      { playerId: "alice", totalScore: 7, roundsWon: 2 },
      { playerId: "bob", totalScore: 15, roundsWon: 1 },
    ]);
  });

  it("ranks equal points by the number of rounds won", () => {
    const standings = roomStandings([
      [result("alice", 0), result("bob", 6)],
      [result("alice", 3), result("bob", 0)],
      [result("alice", 3), result("bob", 0)],
    ]);

    expect(standings).toEqual([
      { playerId: "bob", totalScore: 6, roundsWon: 2 },
      { playerId: "alice", totalScore: 6, roundsWon: 1 },
    ]);
  });
});
