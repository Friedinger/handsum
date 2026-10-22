import type { DeckFact } from "@/data/deckDescription";
import {
  cardActionDescriptions,
  cardActionNames,
} from "@/data/strings/cardActions";
import { deckOverview } from "@/data/strings/deckOverview";
import {
  CALLER_PENALTY,
  LAYOUT_SIZE,
  SPECIAL_LAYOUT_PENALTY,
  SPECIAL_LAYOUT_VALUES,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

interface RulesSection {
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly items?: readonly string[];
  readonly facts?: readonly DeckFact[];
}

const rulesSections: readonly RulesSection[] = [
  {
    heading: "How you score",
    items: [
      "Every card is worth the number on it. When the game is over, each player adds up the cards on their table.",
      "The lowest sum wins and counts as 0 points. If several players share the lowest sum, they all win.",
      "Everyone else gets their sum as points.",
      `Ending the game is a bet: if someone ends with a lower sum than the player who ended it, that player gets ${String(CALLER_PENALTY)} points on top. If they only tie for the lowest sum, they win alone.`,
      `One hand beats all others: ${SPECIAL_LAYOUT_VALUES.join(", ")}. Whoever holds exactly these cards at the end wins, and each opponent gets ${String(SPECIAL_LAYOUT_PENALTY)} points, however low their sum is.`,
    ],
  },
  {
    heading: "The cards",
    paragraphs: [deckOverview.total],
    facts: deckOverview.facts,
  },
  {
    heading: "Your table",
    items: [
      `Your ${String(LAYOUT_SIZE)} face-down cards sit in a row and only move when you swap one of them.`,
      `Seeing your own cards is rationed: ${String(STARTING_VIEW_CARD_COUNT)} of them at the start, afterwards only through a card power.`,
    ],
  },
  {
    heading: "The two piles",
    items: [
      "Draw pile: face down. Whoever draws its top card is the only one who sees it.",
      "Discard pile: face up. Everybody sees its top card.",
    ],
  },
  {
    heading: "Your turn",
    paragraphs: ["Pick exactly one:"],
    items: [
      "Draw a card. Then play its power if it has one, or keep it, or pass it. Keeping means it goes onto your table in place of a card, and that card lands on the discard pile. Passing means it goes straight to the discard pile.",
      "Take the visible top card of the discard pile. It must go onto your table in place of a card.",
      "Announce the end of the game instead of taking a card.",
    ],
  },
  {
    heading: "Ending the game",
    paragraphs: [
      "Think you hold the lowest sum? Spend your turn announcing the end. All the others play one more turn, then every card is revealed.",
    ],
  },
  {
    heading: "Card powers",
    items: [
      "A power can be played only with a card you have just drawn from the draw pile.",
      "It has to be played at that very moment, and the card goes to the discard pile afterwards.",
      "A drawn card that is not played this way is a plain number card.",
      "Cards from the discard pile and from your table never have a power.",
      `${cardActionNames.viewOwn}: ${cardActionDescriptions.viewOwn}`,
      `${cardActionNames.viewOther}: ${cardActionDescriptions.viewOther}`,
      `${cardActionNames.exchangeBlind}: ${cardActionDescriptions.exchangeBlind}`,
    ],
  },
  {
    heading: "Replacing a group",
    paragraphs: [
      "The card that goes onto your table may take the spot of two, three or all four cards at once, if you think they carry the same number.",
      "Before anything moves, the group is shown to the table. A wrong guess changes nothing on your table: the new card goes to the discard pile and your turn ends. A right guess sends the whole group to the discard pile in exchange for the new card, so your table shrinks.",
      "Example: you remember three 9s. Pick all three and put the new card there. Two cards remain on your table.",
    ],
  },
];

export const rules = {
  open: "Rules",
  title: "Rules",
  close: "Close",
  sections: rulesSections,
} as const;
