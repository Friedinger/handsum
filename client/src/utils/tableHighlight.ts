import type { ClickTarget } from "@/utils/tableIntent";

export interface Highlight {
  readonly targets: readonly ClickTarget[];
  readonly callEnd: boolean;
}

export const noHighlight: Highlight = { targets: [], callEnd: false };

function sameTarget(a: ClickTarget, b: ClickTarget): boolean {
  if (a.kind !== "slot" || b.kind !== "slot") {
    return a.kind === b.kind;
  }
  return (
    a.slot.playerId === b.slot.playerId && a.slot.slotIndex === b.slot.slotIndex
  );
}

export function isHighlighted(
  highlight: Highlight,
  target: ClickTarget,
): boolean {
  return highlight.targets.some((candidate) => sameTarget(candidate, target));
}
