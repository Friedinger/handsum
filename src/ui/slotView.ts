import type { Card } from "../engine";

export interface SlotView {
  readonly slotIndex: number;
  readonly card: Card;
  readonly faceUp: boolean;
  readonly clickable: boolean;
  readonly marked: boolean;
  readonly anchor: string;
  readonly inFlight: boolean;
  readonly peeked: boolean;
}

export type CardSize = "large" | "medium" | "small";

const LOW_VALUE_LIMIT = 3;
const MIDDLE_VALUE_LIMIT = 6;

export function valueTier(
  card: Card,
): "low" | "middle" | "action" | "plain-high" {
  if (card.action) {
    return "action";
  }
  if (card.value <= LOW_VALUE_LIMIT) {
    return "low";
  }
  return card.value <= MIDDLE_VALUE_LIMIT ? "middle" : "plain-high";
}
