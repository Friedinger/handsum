import type { Card, PlayerId, StartedGame } from "@/engine";

export interface HeldCard {
  readonly holderId: PlayerId;
  readonly card: Card;
}

export function currentHeldCard(state: StartedGame): HeldCard | null {
  const { phase } = state;
  if (phase.kind !== "playing" || phase.step.kind !== "holdingDrawnCard") {
    return null;
  }
  return { holderId: phase.currentPlayerId, card: phase.step.card };
}
