import { strings } from "@/data/strings";
import type { Card, GameEvent, Move, PlayerId, StartedGame } from "@/engine";

export function playerName(state: StartedGame, playerId: PlayerId): string {
  return (
    state.seats.find((seat) => seat.player.id === playerId)?.player.name ??
    playerId
  );
}

function slotList(slotIndices: readonly number[]): string {
  return slotIndices.map(strings.slotLabel).join(" + ");
}

function cardList(cards: readonly Card[]): string {
  return cards.map((card) => String(card.value)).join(", ");
}

export function describeMove(state: StartedGame, move: Move): string {
  const name = strings.moveNames[move.type];
  switch (move.type) {
    case "viewStartingCards":
    case "swapDrawnCard":
    case "swapDiscardCard":
      return `${name}: ${slotList(move.slotIndices)}`;
    case "viewOwnCard":
      return `${name}: ${strings.slotLabel(move.slotIndex)}`;
    case "viewOtherCard":
      return `${name}: ${playerName(state, move.targetPlayerId)}, ${strings.slotLabel(move.slotIndex)}`;
    case "exchangeBlind":
      return `${name}: ${strings.slotLabel(move.ownSlotIndex)} ↔ ${playerName(state, move.targetPlayerId)}, ${strings.slotLabel(move.targetSlotIndex)}`;
    case "startGame":
    case "drawFromDeck":
    case "discardDrawnCard":
    case "callEnd":
      return name;
  }
}

export function describeEvent(state: StartedGame, event: GameEvent): string {
  switch (event.type) {
    case "drawPileReshuffled":
      return strings.events.drawPileReshuffled(event.cardCount);
    case "cardsRevealed":
      return strings.events.cardsRevealed(
        playerName(state, event.playerId),
        cardList(event.cards),
        slotList(event.slotIndices),
        event.matched,
      );
    case "cardViewed":
      return strings.events.cardViewed(
        playerName(state, event.viewerId),
        playerName(state, event.ownerId),
        strings.slotLabel(event.slotIndex),
        event.card.value,
      );
  }
}
