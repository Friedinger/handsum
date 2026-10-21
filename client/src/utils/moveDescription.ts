import { strings } from "@/data/strings";
import type { Move, StartedGame } from "@/engine";
import { displayName } from "@/utils/displayName";

const MAX_LOG_ENTRIES = 3;

function describeMove(state: StartedGame, move: Move): string | null {
  const { moveLog } = strings;
  const player = displayName(state, move.playerId);
  switch (move.type) {
    case "startGame":
    case "viewStartingCards":
      return null;
    case "drawFromDeck":
      return moveLog.drewCard(player);
    case "discardDrawnCard":
      return moveLog.discardedDrawnCard(player);
    case "swapDrawnCard":
      return moveLog.swappedDrawnCard(player, move.slotIndices.length);
    case "swapDiscardCard":
      return moveLog.swappedDiscardCard(player, move.slotIndices.length);
    case "viewOwnCard":
      return moveLog.viewedOwnCard(player);
    case "viewOtherCard":
      return moveLog.viewedOtherCard(
        player,
        displayName(state, move.targetPlayerId),
      );
    case "exchangeBlind":
      return moveLog.exchangedBlind(
        player,
        displayName(state, move.targetPlayerId),
      );
    case "callEnd":
      return moveLog.calledEnd(player);
  }
}

export function recentMoveDescriptions(
  state: StartedGame,
  moves: readonly Move[],
): string[] {
  return moves
    .map((move) => describeMove(state, move))
    .filter((description) => description !== null)
    .slice(-MAX_LOG_ENTRIES);
}
