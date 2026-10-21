import {
  type CardAction,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type MoveRejection,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

const cardActionNames = {
  viewOwn: "View own card",
  viewOther: "View other card",
  exchangeBlind: "Blind exchange",
} as const satisfies Record<CardAction, string>;

const cardActionDescriptions = {
  viewOwn:
    "Drawn and clicked: look at one of your own cards without showing it to anyone.",
  viewOther:
    "Drawn and clicked: look at a card of another player without showing it to anyone.",
  exchangeBlind:
    "Drawn and clicked: exchange one of your cards with a card of another player, without looking at either.",
} as const satisfies Record<CardAction, string>;

function cardCount(count: number): string {
  return count === 1 ? "1 card" : `${String(count)} cards`;
}

const rejectionMessages = {
  gameNotStarted: "The game has not started yet.",
  gameAlreadyStarted: "The game has already started.",
  invalidPlayerCount: `A game needs ${String(MIN_PLAYERS)} to ${String(MAX_PLAYERS)} players.`,
  invalidPlayerId: "Every player needs an ID.",
  duplicatePlayerId: "Player IDs must be unique.",
  emptyPlayerName: "Every player needs a name.",
  invalidSeed: "The seed must be an unsigned 32-bit integer.",
  unknownPlayer: "This player is not part of the game.",
  wrongPhase: "This move is not possible in the current phase.",
  alreadyViewed: "You have already viewed your starting cards.",
  wrongCardCount: `Select exactly ${String(STARTING_VIEW_CARD_COUNT)} cards.`,
  notYourTurn: "It is not your turn.",
  wrongTurnStep: "This move is not possible at this point of your turn.",
  drawPileEmpty: "There are no cards left to draw.",
  discardPileEmpty: "The discard pile is empty.",
  invalidSlot: "This slot does not exist.",
  duplicateSlot: "Each slot can only be selected once.",
  noSlotSelected: "Select at least one slot.",
  emptySlot: "This slot is empty.",
  wrongCardAction: "The drawn card does not allow this action.",
  invalidTarget: "Choose another player.",
  endAlreadyCalled: "The end has already been called.",
} as const satisfies Record<MoveRejection, string>;

export const strings = {
  appTitle: "Handsum",
  cardActionNames,
  cardActionDescriptions,
  rejectionMessages,
  connection: {
    offline: "No connection to the server. Retrying …",
  },
  moveLog: {
    drewCard: (player: string) => `${player} drew a card`,
    discardedDrawnCard: (player: string) =>
      `${player} threw the drawn card away`,
    swappedDrawnCard: (player: string, count: number) =>
      `${player} swapped ${cardCount(count)} with the drawn card`,
    swappedDiscardCard: (player: string, count: number) =>
      `${player} swapped ${cardCount(count)} with the discard pile`,
    viewedOwnCard: (player: string) => `${player} looked at an own card`,
    viewedOtherCard: (player: string, target: string) =>
      `${player} looked at a card of ${target}`,
    exchangedBlind: (player: string, target: string) =>
      `${player} exchanged a card with ${target}`,
    calledEnd: (player: string) => `${player} called the end`,
  },
  turnAlert: {
    title: "▶ Your turn – Handsum",
  },
  cardSymbol: "◆",
  home: {
    tagline: `A card game for ${String(MIN_PLAYERS)} to ${String(MAX_PLAYERS)} players in the browser.`,
    createRoom: "Create a room",
    roomCode: "Room code",
    joinRoom: "Join",
    invalidRoomCode: "Room codes have six letters or digits.",
    disclaimer:
      "Unofficial fan project, not affiliated with the original publisher.",
  },
  nameForm: {
    label: "Your name",
    submit: "Join room",
    connecting: "Connecting…",
  },
  lobby: {
    title: (roomCode: string) => `Room ${roomCode}`,
    shareHint: "Share this link with the other players:",
    copyLink: "Copy link",
    copied: "Copied!",
    copyFailed: "Copying failed. Select the link and copy it by hand.",
    players: "Players",
    start: "Start game",
    playerLimits: (min: number, max: number) =>
      `A game needs ${String(min)} to ${String(max)} players.`,
    startHint: "Anyone can start the game once everyone is here.",
    leave: "Leave room",
  },
  hints: {
    startingView:
      "Click two of your cards to look at them. Remember them well!",
    rememberCards:
      "Remember your cards! They will be hidden again in a moment.",
    waitingForStartingView: "Waiting for the others to look at their cards…",
    choosing:
      "Click the draw pile to draw a card, or the discard pile to take its top card.",
    takingDiscard:
      "Select one or more of your cards with the same value, then click the taken card to swap. Click the discard pile to put it back.",
    takingDiscardSelected:
      "Click the taken card to swap it with the selected cards, or select more cards with the same value.",
    holding:
      "Select one or more of your cards with the same value to swap them with the drawn card, or click the discard pile to throw it away.",
    holdingAction:
      "Select one or more of your cards with the same value to swap them, click the discard pile to throw the drawn card away, or click it to use its action.",
    holdingSelected:
      "Click the discard pile to swap the selected cards with the drawn card, or select more cards with the same value.",
    viewOwn:
      "Click one of your cards to look at it. Click the drawn card to cancel.",
    viewOther:
      "Click a card of another player to look at it. Click the drawn card to cancel.",
    exchangeBlind:
      "Click one of your cards and one card of another player to exchange them. Click the drawn card to cancel.",
    othersTurn: (player: string) => `${player} is playing…`,
    lastRound: (caller: string) =>
      `${caller} called the end. Everyone else has one last turn.`,
    finished: "The game is over.",
  },
  table: {
    callEnd: "Call the end",
    drawPileCount: (count: number) => `${String(count)} left`,
    drawPile: "Draw pile",
    discardPile: "Discard pile",
    hiddenCard: "Face-down card",
    holdingCard: (player: string) => `${player}'s card`,
    yourCard: "Your card",
    takenCard: "Taken from the discard pile",
    calledEnd: "called the end",
    offline: "offline",
    you: "you",
    leave: "Leave",
    results: "Results",
    cardSum: "Cards",
    score: "Points",
    winner: "Winner",
    youWin: "You win!",
    playerWins: (player: string) => `${player} wins!`,
    backToStart: "Back to start",
    playAgain: "Play again",
  },
  roomFull: {
    notice:
      "This room is full. Please wait for a free seat or try again later.",
  },
  spectator: {
    notice: "This game has already started. Only its players can rejoin.",
  },
} as const;
