import type { CardAction, MoveRejection, MoveType } from "../engine";
import type { SyncRejection } from "../net/moveLog";

const cardActionNames = {
  viewOwn: "View own card",
  viewOther: "View other card",
  exchangeBlind: "Blind exchange",
} as const satisfies Record<CardAction, string>;

const moveNames = {
  startGame: "Start game",
  viewStartingCards: "View starting cards",
  drawFromDeck: "Draw from deck",
  discardDrawnCard: "Discard drawn card",
  swapDrawnCard: "Swap drawn card",
  swapDiscardCard: "Take discard and swap",
  viewOwnCard: cardActionNames.viewOwn,
  viewOtherCard: cardActionNames.viewOther,
  exchangeBlind: cardActionNames.exchangeBlind,
  callEnd: "Call the end",
} as const satisfies Record<MoveType, string>;

const rejectionMessages = {
  gameNotStarted: "The game has not started yet.",
  gameAlreadyStarted: "The game has already started.",
  invalidPlayerCount: "A game needs 2 to 8 players.",
  invalidPlayerId: "Every player needs an ID.",
  duplicatePlayerId: "Player IDs must be unique.",
  emptyPlayerName: "Every player needs a name.",
  invalidSeed: "The seed must be an unsigned 32-bit integer.",
  unknownPlayer: "This player is not part of the game.",
  wrongPhase: "This move is not possible in the current phase.",
  alreadyViewed: "You have already viewed your starting cards.",
  wrongCardCount: "Select exactly two cards.",
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

const syncRejectionMessages = {
  ...rejectionMessages,
  wrongSender: "This move belongs to another player.",
  otherGame: "This move belongs to a different game start.",
  staleSequence: "This move arrived too late.",
} as const satisfies Record<SyncRejection, string>;

export const strings = {
  appTitle: "Handsum",
  cardActionNames,
  moveNames,
  rejectionMessages,
  syncRejectionMessages,
  cardSymbol: "◆",
  hiddenCard: "?",
  emptySlot: "—",
  slotLabel: (slotIndex: number) => `slot ${String(slotIndex + 1)}`,
  events: {
    drawPileReshuffled: (cardCount: number) =>
      `The discard pile was reshuffled into the draw pile (${String(cardCount)} cards).`,
    cardsRevealed: (player: string, cards: string, slots: string, matched: boolean) =>
      `${player} revealed ${cards} from ${slots}: ${matched ? "match" : "no match, turn lost"}.`,
    cardViewed: (viewer: string, owner: string, slot: string, value: number) =>
      `${viewer} viewed ${owner}'s ${slot}: ${String(value)}.`,
  },
  phaseNames: {
    startingView: "Viewing starting cards",
    playing: "Playing",
    finished: "Finished",
  },
  home: {
    tagline: "A card game for 2 to 8 players in the browser.",
    createRoom: "Create a room",
    roomCode: "Room code",
    joinRoom: "Join",
    invalidRoomCode: "Room codes have six letters or digits.",
    disclaimer: "Unofficial fan project, not affiliated with the original publisher.",
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
    players: "Players",
    start: "Start game",
    playerLimits: (min: number, max: number) =>
      `A game needs ${String(min)} to ${String(max)} players.`,
    startHint: "Anyone can start the game once everyone is here.",
    leave: "Leave room",
  },
  hints: {
    startingView: "Click two of your cards to look at them. Remember them well!",
    rememberCards: "Remember your cards! They will be hidden again in a moment.",
    waitingForStartingView: "Waiting for the others to look at their cards…",
    choosing: "Click the draw pile to draw a card, or the discard pile to take its top card.",
    takingDiscard:
      "Click one of your cards to swap it with the taken card, or click the discard pile to put it back.",
    holding:
      "Click one of your cards to swap it with the drawn card, or click the discard pile to throw it away.",
    holdingAction:
      "Click one of your cards to swap it, click the discard pile to throw it away, or click the drawn card to use its action.",
    severalCards: "Select your cards with the same value, then click the card you hold to swap.",
    severalCardsSelected:
      "Click the card you hold to swap it with the selected cards. They must all share one value.",
    viewOwn: "Click one of your cards to look at it. Click the drawn card to cancel.",
    viewOther: "Click a card of another player to look at it. Click the drawn card to cancel.",
    exchangeBlind:
      "Click one of your cards and one card of another player to exchange them. Click the drawn card to cancel.",
    othersTurn: (player: string) => `${player} is playing…`,
    lastRound: (caller: string) => `${caller} called the end. Everyone else has one last turn.`,
    finished: "The game is over.",
  },
  table: {
    callEnd: "Call the end",
    swapSeveral: "Swap several cards",
    drawPileCount: (count: number) => `${String(count)} left`,
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
  },
  activity: {
    title: "What happened",
    startGame: (player: string) => `${player} started the game.`,
    viewStartingCards: (player: string) => `${player} looked at their starting cards.`,
    drawFromDeck: (player: string) => `${player} drew a card.`,
    discardDrawnCard: (player: string) => `${player} discarded the drawn card.`,
    swapDrawnCard: (player: string, slots: string) =>
      `${player} swapped the drawn card with ${slots}.`,
    swapDiscardCard: (player: string, slots: string) =>
      `${player} took the discard and swapped it with ${slots}.`,
    viewOwnCard: (player: string, slot: string) => `${player} looked at their own ${slot}.`,
    viewOtherCard: (player: string, owner: string, slot: string) =>
      `${player} looked at ${owner}'s ${slot}.`,
    exchangeBlind: (player: string, slot: string, owner: string, ownerSlot: string) =>
      `${player} blindly exchanged their ${slot} with ${owner}'s ${ownerSlot}.`,
    callEnd: (player: string) => `${player} called the end.`,
  },
  spectator: {
    notice: "This game has already started. Only its players can rejoin.",
  },
  hotseat: {
    status: "Status",
    phase: "Phase",
    currentPlayer: "Current player",
    endCaller: "End called by",
    moveCount: "Moves",
    drawPile: "Draw pile",
    discardPile: "Discard pile",
    heldCard: "Drawn card",
    lastEvents: "Last move events",
    viewed: "done viewing",
    nobody: "nobody",
    title: "Handsum hot-seat (debug)",
    playerName: (seatNumber: number) => `Player ${String(seatNumber)}`,
    playerCount: "Players",
    seed: "Seed",
    start: "Start game",
    reset: "Reset",
    undo: "Undo last move",
    revealAll: "Reveal all cards",
    followTurn: "Follow the active player",
    actingAs: "Acting as",
    legalMoves: "Legal moves",
    noLegalMoves: "No legal moves for this player.",
    manualMove: "Submit a move as JSON",
    submit: "Submit",
    invalidJson: "This is not valid JSON.",
    moveLog: "Move log",
    fullState: "Full state",
  },
} as const;
