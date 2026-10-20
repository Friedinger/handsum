import { findSeat, type PlayerId, type StartedGame } from "@/engine";

export function displayName(state: StartedGame, playerId: PlayerId): string {
  return findSeat(state, playerId)?.player.name ?? playerId;
}
