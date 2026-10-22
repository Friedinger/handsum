import {
  cardActionDescriptions,
  cardActionNames,
} from "@/data/strings/de/cardActions";
import { moveLog } from "@/data/strings/de/moveLog";
import { rejectionMessages } from "@/data/strings/de/rejections";
import { rules } from "@/data/strings/de/rules";
import { tutorial } from "@/data/strings/de/tutorial";
import type { Strings } from "@/data/strings/types";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/engine";

export const de: Strings = {
  appTitle: "Handsum",
  language: {
    label: "Sprache",
    names: { en: "English", de: "Deutsch" },
  },
  cardActionNames,
  cardActionDescriptions,
  rejectionMessages,
  connection: {
    offline: "Keine Verbindung zum Server. Neuer Versuch …",
  },
  moveLog,
  build: {
    commitTitle: "Diese Version auf GitHub öffnen",
  },
  legal: {
    imprint: "Impressum",
    privacy: "Datenschutz",
  },
  turnAlert: {
    title: "▶ Du bist dran – Handsum",
  },
  cardSymbol: "◆",
  rules,
  tutorial,
  home: {
    tagline: `Ein Kartenspiel für ${String(MIN_PLAYERS)} bis ${String(MAX_PLAYERS)} Spieler im Browser.`,
    createRoom: "Raum erstellen",
    roomCode: "Raumcode",
    joinRoom: "Beitreten",
    invalidRoomCode: "Raumcodes bestehen aus sechs Buchstaben oder Ziffern.",
    disclaimer:
      "Inoffizielles Fan-Projekt, nicht mit dem Originalverlag verbunden.",
  },
  nameForm: {
    label: "Dein Name",
    submit: "Raum betreten",
    connecting: "Verbinde …",
    invalid: rejectionMessages.invalidPlayerName,
  },
  lobby: {
    title: (roomCode: string) => `Raum ${roomCode}`,
    shareHint: "Teile diesen Link mit den anderen Spielern:",
    share: "Teilen",
    shareTitle: "Komm in mein Handsum-Spiel",
    copyLink: "Link kopieren",
    copied: "Kopiert!",
    copyFailed:
      "Kopieren fehlgeschlagen. Markiere den Link und kopiere ihn von Hand.",
    players: "Spieler",
    start: "Spiel starten",
    playerLimits: (min: number, max: number) =>
      `Ein Spiel braucht ${String(min)} bis ${String(max)} Spieler.`,
    startHint: "Sobald alle da sind, kann jeder das Spiel starten.",
  },
  hints: {
    startingView:
      "Klicke auf zwei deiner Karten, um sie anzusehen. Merk sie dir gut!",
    rememberCards: "Merk dir deine Karten! Gleich werden sie wieder verdeckt.",
    waitingForStartingView:
      "Warte, bis die anderen ihre Karten angesehen haben …",
    choosing:
      "Klicke auf den Nachziehstapel, um zu ziehen, oder den Ablagestapel, um dessen oberste Karte zu nehmen.",
    takingDiscard:
      "Wähle eine oder mehrere deiner Karten mit gleichem Wert und klicke dann den Ablagestapel, um zu tauschen. Ohne Auswahl legst du die Karte zurück.",
    takingDiscardSelected:
      "Klicke auf den Ablagestapel, um die gewählten Karten gegen die genommene Karte zu tauschen, oder wähle weitere Karten mit gleichem Wert.",
    holding:
      "Wähle eine oder mehrere deiner Karten mit gleichem Wert, um sie gegen die gezogene Karte zu tauschen, oder klicke auf den Ablagestapel, um sie abzulegen.",
    holdingAction:
      "Wähle eine oder mehrere deiner Karten mit gleichem Wert, um sie zu tauschen, klicke auf den Ablagestapel, um die gezogene Karte abzulegen, oder klicke auf die Karte, um ihre Fähigkeit zu nutzen.",
    holdingSelected:
      "Klicke auf den Ablagestapel, um die gewählten Karten gegen die gezogene Karte zu tauschen, oder wähle weitere Karten mit gleichem Wert.",
    viewOwn:
      "Klicke auf eine deiner Karten, um sie anzusehen. Klicke auf die gezogene Karte, um abzubrechen.",
    viewOther:
      "Klicke auf eine Karte eines anderen Spielers, um sie anzusehen. Klicke auf die gezogene Karte, um abzubrechen.",
    exchangeBlind:
      "Klicke auf eine deiner Karten und auf eine Karte eines anderen Spielers, um sie zu tauschen. Klicke auf die gezogene Karte, um abzubrechen.",
    othersTurn: (player: string) => `${player} ist am Zug …`,
    lastRound: (caller: string) =>
      `${caller} hat das Ende angesagt. Alle anderen haben noch einen letzten Zug.`,
    finished: "Das Spiel ist vorbei.",
  },
  table: {
    callEnd: "Ende ansagen",
    confirmCallEnd: "Wirklich Ende ansagen?",
    drawPileCount: (count: number) => `noch ${String(count)}`,
    drawPile: "Nachziehstapel",
    discardPile: "Ablagestapel",
    hiddenCard: "Verdeckte Karte",
    holdingCard: (player: string) => `Karte von ${player}`,
    yourCard: "Deine Karte",
    takenCard: "Vom Ablagestapel genommen",
    calledEnd: "hat Ende angesagt",
    offline: "offline",
    you: "du",
    leave: "Verlassen",
    confirmLeave: "Wirklich verlassen?",
    results: "Ergebnis",
    cardSum: "Summe",
    score: "Punkte",
    winner: "Gewinner",
    youWin: "Du gewinnst!",
    playerWins: (player: string) => `${player} gewinnt!`,
    winnerSeparator: " & ",
    playAgain: "Nochmal spielen",
  },
  roomFull: {
    notice:
      "Dieser Raum ist voll. Warte auf einen freien Platz oder versuche es später noch einmal.",
  },
  spectator: {
    notice:
      "Dieses Spiel hat schon begonnen. Nur seine Spieler können wieder beitreten.",
  },
};
