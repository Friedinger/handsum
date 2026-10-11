import { strings } from "../../data/strings";
import type { Card, Slot } from "../../engine";
import { element } from "./dom";

export function renderFaceUpCard(card: Card): HTMLElement {
  return element("div", { className: "card" }, [
    element("span", { className: "card-value" }, [String(card.value)]),
    element("span", { className: "card-symbol" }, [strings.cardSymbol]),
    card.action &&
      element("span", { className: "card-action" }, [strings.cardActionNames[card.action]]),
  ]);
}

export function renderSlot(slot: Slot, visible: boolean): HTMLElement {
  if (!slot) {
    return element("div", { className: "card card-empty" }, [strings.emptySlot]);
  }
  if (!visible) {
    return element("div", { className: "card card-hidden" }, [strings.hiddenCard]);
  }
  return renderFaceUpCard(slot);
}
