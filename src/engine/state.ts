import type { PlayerId, Seat, Slot, StartedGame } from "./types";

export function seatIndexOf(state: StartedGame, playerId: PlayerId): number {
  return state.seats.findIndex((seat) => seat.player.id === playerId);
}

export function nextPlayerId(state: StartedGame, playerId: PlayerId): PlayerId {
  const nextSeat = state.seats[(seatIndexOf(state, playerId) + 1) % state.seats.length];
  if (!nextSeat) {
    throw new Error("Game has no seats");
  }
  return nextSeat.player.id;
}

export function replaceAt<T>(items: readonly T[], index: number, item: T): T[] {
  return items.map((existing, existingIndex) => (existingIndex === index ? item : existing));
}

export function withLayout(
  state: StartedGame,
  seatIndex: number,
  layout: readonly Slot[],
): readonly Seat[] {
  return state.seats.map((seat, index) => (index === seatIndex ? { ...seat, layout } : seat));
}
