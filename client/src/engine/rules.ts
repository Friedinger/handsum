export const LAYOUT_SIZE = 4;
export const STARTING_VIEW_CARD_COUNT = 2;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const CALLER_PENALTY = 5;
export const SPECIAL_LAYOUT_VALUES: readonly number[] = [12, 12, 13, 13];
export const SPECIAL_LAYOUT_PENALTY = 50;

export const PLAYER_NAME_MAX_LENGTH = 24;

const NAME_CHARACTERS = String.raw`\p{L}\p{N}\p{M}`;
const PLAYER_NAME_PATTERN = new RegExp(
  `^(?=.{1,${String(PLAYER_NAME_MAX_LENGTH)}}$)[${NAME_CHARACTERS}][${NAME_CHARACTERS} ._'’-]*(?<! )$`,
  "u",
);

/**
 * Letters, digits and a few separators only: the name is shown to everyone, so anything invisible or
 * direction-changing is kept out.
 */
export function isValidPlayerName(name: string): boolean {
  return PLAYER_NAME_PATTERN.test(name);
}

export const SLOT_INDICES: readonly number[] = Array.from(
  { length: LAYOUT_SIZE },
  (_, slotIndex) => slotIndex,
);
