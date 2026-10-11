import type { PlayerId, Seat } from "../engine";

export interface TableSides {
  readonly left: readonly Seat[];
  readonly top: readonly Seat[];
  readonly right: readonly Seat[];
}

const SIDES_PER_TABLE = 3;

export function opponentsInTurnOrder(
  seats: readonly Seat[],
  selfId: PlayerId,
): Seat[] {
  const selfIndex = seats.findIndex((seat) => seat.player.id === selfId);
  return [
    ...seats.slice(selfIndex + 1),
    ...seats.slice(0, Math.max(selfIndex, 0)),
  ];
}

// Turns pass clockwise: the next player sits on the left (listed bottom to top), then across
// the top (left to right), then down the right side (top to bottom).
export function arrangeOpponents(
  seats: readonly Seat[],
  selfId: PlayerId,
): TableSides {
  const opponents = opponentsInTurnOrder(seats, selfId);
  if (opponents.length === 1) {
    return { left: [], top: opponents, right: [] };
  }
  const perSide = Math.max(1, Math.floor(opponents.length / SIDES_PER_TABLE));
  const topCount = opponents.length - 2 * perSide;
  return {
    left: opponents.slice(0, perSide).reverse(),
    top: opponents.slice(perSide, perSide + topCount),
    right: opponents.slice(perSide + topCount),
  };
}
