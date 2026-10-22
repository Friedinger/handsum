import {
  type DeckWording,
  describeDeck,
  valuesWithPower,
} from "@/data/deckDescription";
import { cardActionNames } from "@/data/strings/de/cardActions";
import { standardCardTypes } from "@/engine/deck";

export const deckWording: DeckWording = {
  pair: (first, second) => `${String(first)} und ${String(second)}`,
  range: (first, last) => `${String(first)} bis ${String(last)}`,
  list: (leading, last) => `${leading} und ${last}`,
  each: (count) => `je ${String(count)}`,
  total: (count) => `${String(count)} Karten insgesamt.`,
  actionName: (action) => cardActionNames[action],
};

export const deckOverview = describeDeck(standardCardTypes, deckWording);

export const lowestCardValue = Math.min(
  ...standardCardTypes.map((type) => type.value),
);
export const highestCardValue = Math.max(
  ...standardCardTypes.map((type) => type.value),
);
export const powerValues = valuesWithPower(standardCardTypes, deckWording);
