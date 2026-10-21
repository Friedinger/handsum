import type { CardAction } from "@/engine";

export const cardActionNames = {
  viewOwn: "View own card",
  viewOther: "View other card",
  exchangeBlind: "Blind exchange",
} as const satisfies Record<CardAction, string>;

export const cardActionDescriptions = {
  viewOwn: "Secretly look at one of your cards.",
  viewOther: "Secretly look at one card of an opponent.",
  exchangeBlind:
    "Trade one of your cards for one of an opponent's. Nobody looks at them first.",
} as const satisfies Record<CardAction, string>;
