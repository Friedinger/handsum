import {
  type GameState,
  initialGameState,
  type Move,
  type PlayerId,
  type StartedGame,
  tryApplyMove,
} from "@/engine";

/**
 * The own slots whose card the player has seen and not lost track of: every way of learning a
 * card is a move of the player, and a blind exchange hands over the card of the slot.
 */
export function knownOwnSlots(
  moves: readonly Move[],
  selfId: PlayerId,
): Set<number> {
  const known = new Set<number>();
  const viewedOpponentSlots = new Set<number>();
  let state: GameState = initialGameState;
  for (const move of moves) {
    if (move.playerId === selfId) {
      switch (move.type) {
        case "viewStartingCards":
          move.slotIndices.forEach((slot) => known.add(slot));
          break;
        case "viewOwnCard":
          known.add(move.slotIndex);
          break;
        case "viewOtherCard":
          viewedOpponentSlots.add(move.slotIndex);
          break;
        case "swapDrawnCard":
        case "swapDiscardCard": {
          const [target = 0, ...others] = [...move.slotIndices].sort(
            (a, b) => a - b,
          );
          known.add(target);
          others.forEach((slot) => known.delete(slot));
          break;
        }
        case "exchangeBlind":
          if (viewedOpponentSlots.has(move.targetSlotIndex)) {
            known.add(move.ownSlotIndex);
          } else {
            known.delete(move.ownSlotIndex);
          }
          break;
        default:
          break;
      }
    }
    const outcome = tryApplyMove(state, move);
    if (!outcome.ok) {
      break;
    }
    state = outcome.value;
  }
  return known;
}

export function knowsAllOwnCards(
  moves: readonly Move[],
  state: StartedGame,
  selfId: PlayerId,
): boolean {
  const known = knownOwnSlots(moves, selfId);
  const seat = state.seats.find((candidate) => candidate.player.id === selfId);
  return (seat?.layout ?? []).every(
    (card, slotIndex) => card === null || known.has(slotIndex),
  );
}
