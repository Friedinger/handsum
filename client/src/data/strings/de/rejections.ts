import type { Strings } from "@/data/strings/types";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PLAYER_NAME_MAX_LENGTH,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

export const rejectionMessages: Strings["rejectionMessages"] = {
  gameNotStarted: "Das Spiel hat noch nicht begonnen.",
  gameAlreadyStarted: "Das Spiel hat schon begonnen.",
  invalidPlayerCount: `Ein Spiel braucht ${String(MIN_PLAYERS)} bis ${String(MAX_PLAYERS)} Spieler.`,
  invalidPlayerId: "Jeder Spieler braucht eine ID.",
  duplicatePlayerId: "Spieler-IDs müssen eindeutig sein.",
  invalidPlayerName: `Namen haben bis zu ${String(PLAYER_NAME_MAX_LENGTH)} Zeichen: nur Buchstaben, Ziffern, Leerzeichen und . _ ' -`,
  invalidSeed: "Der Seed muss eine vorzeichenlose 32-Bit-Ganzzahl sein.",
  invalidDeck: "Das Deck muss genau aus den Karten des Standarddecks bestehen.",
  unknownPlayer: "Dieser Spieler gehört nicht zum Spiel.",
  wrongPhase: "Diese Aktion ist in der aktuellen Phase nicht möglich.",
  alreadyViewed: "Du hast deine Startkarten schon angesehen.",
  wrongCardCount: `Wähle genau ${String(STARTING_VIEW_CARD_COUNT)} Karten aus.`,
  notYourTurn: "Du bist nicht am Zug.",
  wrongTurnStep: "Diese Aktion ist an dieser Stelle deines Zugs nicht möglich.",
  drawPileEmpty: "Es sind keine Karten zum Ziehen mehr da.",
  discardPileEmpty: "Der Ablagestapel ist leer.",
  invalidSlot: "Diesen Platz gibt es nicht.",
  duplicateSlot: "Jeder Platz kann nur einmal gewählt werden.",
  noSlotSelected: "Wähle mindestens einen Platz aus.",
  emptySlot: "Dieser Platz ist leer.",
  wrongCardAction: "Die gezogene Karte erlaubt diese Aktion nicht.",
  invalidTarget: "Wähle einen anderen Spieler.",
  endAlreadyCalled: "Das Ende wurde schon angesagt.",
};
