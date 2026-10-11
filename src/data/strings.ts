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
  table: {
    status: "Status",
    phase: "Phase",
    currentPlayer: "Current player",
    endCaller: "End called by",
    moveCount: "Moves",
    drawPile: "Draw pile",
    discardPile: "Discard pile",
    heldCard: "Drawn card",
    lastEvents: "Last move events",
    results: "Results",
    cardSum: "Card sum",
    score: "Score",
    winner: "Winner",
    viewed: "done viewing",
    nobody: "nobody",
    you: "you",
    online: "online",
    offline: "offline",
    yourTurn: "Your turn",
    playersTurn: (name: string) => `${name}'s turn`,
    yourMoves: "Your options",
    waitingForOthers: "Waiting for the other players…",
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
  spectator: {
    notice: "This game has already started. Only its players can rejoin.",
  },
  hotseat: {
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
