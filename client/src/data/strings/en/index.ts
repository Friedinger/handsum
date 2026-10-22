import {
  cardActionDescriptions,
  cardActionNames,
} from "@/data/strings/cardActions";
import { moveLog } from "@/data/strings/moveLog";
import { rejectionMessages } from "@/data/strings/rejections";
import { rules } from "@/data/strings/rules";
import { tutorial } from "@/data/strings/tutorial";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/engine";

export const strings = {
  appTitle: "Handsum",
  cardActionNames,
  cardActionDescriptions,
  rejectionMessages,
  connection: {
    offline: "No connection to the server. Retrying …",
  },
  moveLog,
  build: {
    commitTitle: "Open this version on GitHub",
  },
  legal: {
    imprint: "Imprint",
    privacy: "Privacy policy",
  },
  turnAlert: {
    title: "▶ Your turn – Handsum",
  },
  cardSymbol: "◆",
  rules,
  tutorial,
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
    invalid: rejectionMessages.invalidPlayerName,
  },
  lobby: {
    title: (roomCode: string) => `Room ${roomCode}`,
    shareHint: "Share this link with the other players:",
    share: "Share",
    shareTitle: "Join my game of Handsum",
    copyLink: "Copy link",
    copied: "Copied!",
    copyFailed: "Copying failed. Select the link and copy it by hand.",
    players: "Players",
    start: "Start game",
    playerLimits: (min: number, max: number) =>
      `A game needs ${String(min)} to ${String(max)} players.`,
    startHint: "Anyone can start the game once everyone is here.",
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
      "Select one or more of your cards with the same value, then click the discard pile to swap. Click it without a selection to put the card back.",
    takingDiscardSelected:
      "Click the discard pile to swap the selected cards with the taken card, or select more cards with the same value.",
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
    confirmCallEnd: "Really call the end?",
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
    confirmLeave: "Really leave?",
    results: "Results",
    cardSum: "Cards",
    score: "Points",
    winner: "Winner",
    youWin: "You win!",
    playerWins: (player: string) => `${player} wins!`,
    winnerSeparator: " & ",
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
