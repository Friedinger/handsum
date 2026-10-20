import type { MoveRejection } from "@/engine/outcome";
import type { Card, PlayerId, Seat, Slot, StartedGame } from "@/engine/types";

export function seatIndexOf(state: StartedGame, playerId: PlayerId): number {
  return state.seats.findIndex((seat) => seat.player.id === playerId);
}

export function findSeat(
  state: StartedGame,
  playerId: PlayerId,
): Seat | undefined {
  return state.seats.find((seat) => seat.player.id === playerId);
}

export function cardAt(
  state: StartedGame,
  playerId: PlayerId,
  slotIndex: number,
): Card | null {
  return findSeat(state, playerId)?.layout[slotIndex] ?? null;
}

export function nextPlayerId(state: StartedGame, playerId: PlayerId): PlayerId {
  const nextSeat =
    state.seats[(seatIndexOf(state, playerId) + 1) % state.seats.length];
  if (!nextSeat) {
    throw new Error("Game has no seats");
  }
  return nextSeat.player.id;
}

export function isSlotIndex(
  layout: readonly Slot[],
  slotIndex: number,
): boolean {
  return (
    Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < layout.length
  );
}

export function findSlotSelectionProblem(
  layout: readonly Slot[],
  slotIndices: readonly number[],
): MoveRejection | null {
  if (slotIndices.length === 0) {
    return "noSlotSelected";
  }
  if (!slotIndices.every((slotIndex) => isSlotIndex(layout, slotIndex))) {
    return "invalidSlot";
  }
  if (new Set(slotIndices).size !== slotIndices.length) {
    return "duplicateSlot";
  }
  if (slotIndices.some((slotIndex) => layout[slotIndex] === null)) {
    return "emptySlot";
  }
  return null;
}

export function replaceAt<T>(items: readonly T[], index: number, item: T): T[] {
  return items.map((existing, existingIndex) =>
    existingIndex === index ? item : existing,
  );
}

export function withLayout(
  seats: readonly Seat[],
  seatIndex: number,
  layout: readonly Slot[],
): readonly Seat[] {
  return seats.map((seat, index) =>
    index === seatIndex ? { ...seat, layout } : seat,
  );
}
