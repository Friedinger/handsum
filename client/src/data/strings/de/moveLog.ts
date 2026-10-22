import type { Strings } from "@/data/strings/types";

function cardCount(count: number): string {
  return count === 1 ? "1 Karte" : `${String(count)} Karten`;
}

export const moveLog: Strings["moveLog"] = {
  drewCard: (player: string) => `${player} hat eine Karte gezogen`,
  discardedDrawnCard: (player: string) =>
    `${player} hat die gezogene Karte abgelegt`,
  swappedDrawnCard: (player: string, count: number) =>
    `${player} hat ${cardCount(count)} gegen die gezogene Karte getauscht`,
  swappedDiscardCard: (player: string, count: number) =>
    `${player} hat ${cardCount(count)} mit dem Ablagestapel getauscht`,
  viewedOwnCard: (player: string) =>
    `${player} hat eine eigene Karte angesehen`,
  viewedOtherCard: (player: string, target: string) =>
    `${player} hat eine Karte von ${target} angesehen`,
  exchangedBlind: (player: string, target: string) =>
    `${player} hat blind eine Karte mit ${target} getauscht`,
  calledEnd: (player: string) => `${player} hat das Ende angesagt`,
};
