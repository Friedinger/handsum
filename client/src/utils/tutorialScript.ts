import { strings } from "@/data/strings";
import {
  type Move,
  type Player,
  standardDeck,
  type StartedGame,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

export type TutorialStepId = keyof typeof strings.tutorial.steps;

/**
 * Only decides who starts; the cards come from the deck below. Robin must not start, because the
 * lessons begin with the player's draw.
 */
export const TUTORIAL_SEED = 907872902;

export const TUTORIAL_ROOM_CODE = "tutorial";

export const TUTORIAL_PLAYER: Player = {
  id: "tutorial-player",
  name: strings.tutorial.names.player,
};

export const TUTORIAL_OPPONENT: Player = {
  id: "tutorial-opponent",
  name: strings.tutorial.names.opponent,
};

const PLAYER_LAYOUT = [
  12, // high: replaced by the first drawn card
  5, // mid: stays on the table until the end
  10, // seen with the first power, then traded to Robin
  13, // never seen, replaced by the card taken from the discard pile
];

const OPPONENT_LAYOUT = [
  4,
  2, // looked at with the second power, then traded away
  1, // never seen by Robin: he swaps it away blindly
  11,
];

const FIRST_DISCARD = 12;

interface Round {
  readonly player: number | null;
  readonly opponent: number;
}

/**
 * The cards drawn in each round. The player's turns follow TUTORIAL_PLAN: a low card to keep, the
 * three powers, a low card for the group, the discard pile and the end call.
 */
const ROUNDS: readonly Round[] = [
  { player: 2, opponent: 8 }, // kept in place of the 12; Robin throws away the 8
  { player: 7, opponent: 12 }, // look at an own card: the 10; Robin throws away the 12
  { player: 9, opponent: 10 }, // look at Robin's 2; Robin throws away the 10
  { player: 11, opponent: 13 }, // trade the 10 for Robin's 2; Robin throws away the 13
  { player: 0, opponent: 3 }, // replaces the two 2s; Robin keeps the 3 and gives away a 1
  { player: null, opponent: 8 }, // the player takes the 1 from the discard pile
  { player: null, opponent: 9 }, // Robin's last turn, after the player called the end
];

function remainingValues(dealt: readonly number[]): number[] {
  const remaining = standardDeck.map((card) => card.value);
  for (const value of dealt) {
    remaining.splice(remaining.indexOf(value), 1);
  }
  return remaining;
}

function buildTutorialDeck(): number[] {
  const dealt = [
    ...PLAYER_LAYOUT,
    ...OPPONENT_LAYOUT,
    FIRST_DISCARD,
    ...ROUNDS.flatMap(({ player, opponent }) =>
      player === null ? [opponent] : [player, opponent],
    ),
  ];
  return [...dealt, ...remainingValues(dealt)];
}

export const TUTORIAL_DECK: readonly number[] = buildTutorialDeck();

type PlayerMove = Move extends infer M
  ? M extends Move
    ? Omit<M, "playerId">
    : never
  : never;

export interface Lesson {
  readonly step: TutorialStepId;
  readonly move: PlayerMove;
  readonly hint: string;
  readonly position?: number;
}

const { hints } = strings.tutorial;

const STARTING_VIEW_SLOTS = [0, 1];
const KEPT_SLOT = 0;
const UNSEEN_SLOT = 2;
const OPPONENT_LOW_SLOT = 1;
const GROUP_SLOTS = [0, 2];
const TAKEN_SLOT = 3;
/**
 * Slots are counted in the table's order; the group leaves its higher slot empty.
 */
const TAKEN_POSITION = 3;

const DRAW: Lesson = {
  step: "drawAgain",
  move: { type: "drawFromDeck" },
  hint: hints.drawFirst,
};

/**
 * Everything the player does in the guided round, in order. Each entry is the only move the
 * guide accepts at that point.
 */
export const TUTORIAL_PLAN: readonly Lesson[] = [
  {
    step: "lookAtCards",
    move: { type: "viewStartingCards", slotIndices: STARTING_VIEW_SLOTS },
    hint: hints.lookAtLeftCards(STARTING_VIEW_CARD_COUNT),
  },
  { ...DRAW, step: "draw" },
  {
    step: "keep",
    move: { type: "swapDrawnCard", slotIndices: [KEPT_SLOT] },
    hint: hints.keepHighest(KEPT_SLOT + 1),
  },
  DRAW,
  {
    step: "viewOwn",
    move: { type: "viewOwnCard", slotIndex: UNSEEN_SLOT },
    hint: hints.lookAtUnseen(UNSEEN_SLOT + 1),
  },
  DRAW,
  {
    step: "viewOther",
    move: {
      type: "viewOtherCard",
      targetPlayerId: TUTORIAL_OPPONENT.id,
      slotIndex: OPPONENT_LOW_SLOT,
    },
    hint: hints.lookAtOpponentCard(OPPONENT_LOW_SLOT + 1),
    position: OPPONENT_LOW_SLOT + 1,
  },
  DRAW,
  {
    step: "exchangeBlind",
    move: {
      type: "exchangeBlind",
      ownSlotIndex: UNSEEN_SLOT,
      targetPlayerId: TUTORIAL_OPPONENT.id,
      targetSlotIndex: OPPONENT_LOW_SLOT,
    },
    hint: hints.exchangeHighCard(UNSEEN_SLOT + 1, OPPONENT_LOW_SLOT + 1),
    position: OPPONENT_LOW_SLOT + 1,
  },
  DRAW,
  {
    step: "groupReplace",
    move: { type: "swapDrawnCard", slotIndices: GROUP_SLOTS },
    hint: hints.replaceGroup(GROUP_SLOTS.map((slot) => slot + 1)),
  },
  {
    step: "takeDiscard",
    move: { type: "swapDiscardCard", slotIndices: [TAKEN_SLOT] },
    hint: hints.takeLowDiscard(TAKEN_POSITION),
  },
  { step: "callEnd", move: { type: "callEnd" }, hint: hints.callEndNow },
];

const OPPONENT_STARTING_VIEW_SLOTS: readonly number[] = [0, 1];
const OPPONENT_UNSEEN_SLOTS: readonly number[] = [2, 3];
const OPPONENT_KEEP_MAX = 4;

/**
 * Robin keeps a drawn card of up to 4 by swapping it onto the next card he has never seen and
 * throws away everything higher. He never uses card powers.
 */
function opponentTurnMove(moves: readonly Move[], heldValue: number): Move {
  const playerId = TUTORIAL_OPPONENT.id;
  const keptCount = moves.filter(
    (move) => move.playerId === playerId && move.type === "swapDrawnCard",
  ).length;
  const unseenSlot = OPPONENT_UNSEEN_SLOTS[keptCount];
  return heldValue <= OPPONENT_KEEP_MAX && unseenSlot !== undefined
    ? { type: "swapDrawnCard", playerId, slotIndices: [unseenSlot] }
    : { type: "discardDrawnCard", playerId };
}

export function nextOpponentMove(
  state: StartedGame,
  moves: readonly Move[],
): Move | null {
  const playerId = TUTORIAL_OPPONENT.id;
  const { phase } = state;
  if (phase.kind === "startingView") {
    return phase.viewedPlayerIds.includes(playerId)
      ? null
      : {
          type: "viewStartingCards",
          playerId,
          slotIndices: OPPONENT_STARTING_VIEW_SLOTS,
        };
  }
  if (phase.kind !== "playing" || phase.currentPlayerId !== playerId) {
    return null;
  }
  if (phase.step.kind === "awaitingChoice") {
    return { type: "drawFromDeck", playerId };
  }
  return opponentTurnMove(moves, phase.step.card.value);
}
