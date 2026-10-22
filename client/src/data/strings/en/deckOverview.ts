import {
  type DeckWording,
  describeDeck,
  valuesWithPower,
} from "@/data/deckDescription";
import { cardActionNames } from "@/data/strings/cardActions";
import { standardCardTypes } from "@/engine/deck";

export const deckWording: DeckWording = {
  pair: (first, second) => `${String(first)} and ${String(second)}`,
  range: (first, last) => `${String(first)} to ${String(last)}`,
  list: (leading, last) => `${leading} and ${last}`,
  each: (count) => `${String(count)} each`,
  total: (count) => `${String(count)} cards in total.`,
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
