import type { PlayerId, PlayerResult } from "@/engine";

export interface Standing {
  readonly playerId: PlayerId;
  readonly totalScore: number;
  readonly roundsWon: number;
}

function addResult(standing: Standing, result: PlayerResult): Standing {
  return {
    ...standing,
    totalScore: standing.totalScore + result.score,
    roundsWon: standing.roundsWon + (result.isWinner ? 1 : 0),
  };
}

function byFewestPointsThenMostWins(a: Standing, b: Standing): number {
  return a.totalScore - b.totalScore || b.roundsWon - a.roundsWon;
}

export function roomStandings(
  finishedRounds: readonly (readonly PlayerResult[])[],
): Standing[] {
  const standings = new Map<PlayerId, Standing>();
  for (const result of finishedRounds.flat()) {
    const standing = standings.get(result.playerId) ?? {
      playerId: result.playerId,
      totalScore: 0,
      roundsWon: 0,
    };
    standings.set(result.playerId, addResult(standing, result));
  }
  return [...standings.values()].sort(byFewestPointsThenMostWins);
}
