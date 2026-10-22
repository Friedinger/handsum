function cardCount(count: number): string {
  return count === 1 ? "1 card" : `${String(count)} cards`;
}

export const moveLog = {
  drewCard: (player: string) => `${player} drew a card`,
  discardedDrawnCard: (player: string) => `${player} threw the drawn card away`,
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
} as const;
