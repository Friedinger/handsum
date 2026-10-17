import type { PlayerId, StartedGame } from "@/engine";

export function displayName(state: StartedGame, playerId: PlayerId): string {
  return (
    state.seats.find((seat) => seat.player.id === playerId)?.player.name ??
    playerId
  );
}
