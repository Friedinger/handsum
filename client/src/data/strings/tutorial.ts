import {
  cardActionDescriptions,
  cardActionNames,
} from "@/data/strings/cardActions";
import {
  highestCardValue,
  lowestCardValue,
  powerValues,
} from "@/data/strings/deckOverview";
import {
  CALLER_PENALTY,
  LAYOUT_SIZE,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

const opponentName = "Robin";

interface TutorialStepText {
  readonly title: string;
  readonly text: string | ((position: number) => string);
}

export const tutorial = {
  names: { player: "Guest", opponent: opponentName },
  open: "Tutorial",
  skip: "Skip tutorial",
  start: "Start practice round",
  intro: {
    title: "Your goal",
    text: `Every card is worth the number printed on it. Whoever has the lowest sum on their table wins. You have ${String(LAYOUT_SIZE)} face-down cards and may only look at them now and then, so memory is your best tool. Cards go from ${String(lowestCardValue)} to ${String(highestCardValue)}; the ${powerValues} carry a power. Let's play a short round against ${opponentName}.`,
  },
  steps: {
    lookAtCards: {
      title: "Look at your cards",
      text: `Click the ${String(STARTING_VIEW_CARD_COUNT)} cards on the left to look at them. This is the only free look; later, only card powers let you peek. Remember them!`,
    },
    remember: {
      title: "Remember them",
      text: `The cards turn face down again. Keep in mind which of them were high and which were low. ${opponentName} gets ready too.`,
    },
    draw: {
      title: "Draw a card",
      text: "It is your turn. Click the draw pile to draw the top card. Only you can see it.",
    },
    keep: {
      title: "Keep the drawn card",
      text: "A low card, great! Select the highest card you remember, then click the discard pile to swap. The replaced card lands on the discard pile. (In a real game you could also throw the drawn card away.)",
    },
    watchOpponent: {
      title: "Opponent's turn",
      text: `${opponentName} is playing. Everybody can see the top of the discard pile, so keep an eye on it.`,
    },
    drawAgain: {
      title: "Draw again",
      text: "Click the draw pile once more.",
    },
    viewOwn: {
      title: cardActionNames.viewOwn,
      text: `This card has a power. ${cardActionDescriptions.viewOwn} Click the drawn card, then the first card you have not seen yet. Afterwards the drawn card goes to the discard pile.`,
    },
    viewOther: {
      title: cardActionNames.viewOther,
      text: (position: number) =>
        `Another power. ${cardActionDescriptions.viewOther} Click the drawn card, then ${opponentName}'s card at position ${String(position)} from the left.`,
    },
    exchangeBlind: {
      title: cardActionNames.exchangeBlind,
      text: (position: number) =>
        `${cardActionDescriptions.exchangeBlind} Click the drawn card, then the high card you just found and ${opponentName}'s card at position ${String(position)}, the low one you looked at. Give away your high card!`,
    },
    groupReplace: {
      title: "Replace a group",
      text: "Two of your cards show the same number. Select both, then click the discard pile: the drawn card replaces both, so you have one card fewer. Guess wrong and you lose only the drawn card.",
    },
    takeDiscard: {
      title: "Take from the discard pile",
      text: `${opponentName} swapped away a card nobody had seen: a low one! Click the discard pile, select your unseen card, then click the taken card. A card taken from the discard pile must go onto your table.`,
    },
    callEnd: {
      title: "Announce the end",
      text: "You know all your cards and your sum is low. Instead of taking a card, announce the end: click “Call the end”, then confirm.",
    },
    lastRound: {
      title: "One last turn",
      text: "Everyone else plays one more turn. Then all cards are revealed and counted.",
    },
    results: {
      title: "Well done!",
      text: `The lowest sum wins and scores 0, the others score their sum. Calling the end is a bet: if anyone beats your sum, you get ${String(CALLER_PENALTY)} extra points. There is also a special hand, see the “Rules” below.`,
    },
  } satisfies Record<string, TutorialStepText>,
  hints: {
    lookAtLeftCards: (count: number) =>
      `Look at the ${String(count)} cards on the left.`,
    drawFirst: "First draw a card: click the draw pile.",
    keepHighest: (position: number) =>
      `Swap it with the highest card you remember, the one at position ${String(position)} from the left.`,
    lookAtUnseen: (position: number) =>
      `Click the drawn card again, then look at the first card you have not seen yet, at position ${String(position)} from the left.`,
    lookAtOpponentCard: (position: number) =>
      `Click the drawn card again, then look at ${opponentName}'s card at position ${String(position)} from the left.`,
    exchangeHighCard: (ownPosition: number, opponentPosition: number) =>
      `Click the drawn card again, then trade your high card (position ${String(ownPosition)}) for ${opponentName}'s card at position ${String(opponentPosition)}, the one you just looked at.`,
    replaceGroup: (positions: readonly number[]) =>
      `Replace the cards with the same number, at positions ${positions.join(" and ")}, with the drawn card.`,
    takeLowDiscard: (position: number) =>
      `Take the top card of the discard pile and swap it with the card you have not seen yet, the one at position ${String(position)} from the left.`,
    callEndNow: "Your sum is low enough. Click “Call the end” and confirm.",
  },
} as const;
