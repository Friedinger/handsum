import {
  cardActionDescriptions,
  cardActionNames,
} from "@/data/strings/de/cardActions";
import {
  highestCardValue,
  lowestCardValue,
  powerValues,
} from "@/data/strings/de/deckOverview";
import type { Strings } from "@/data/strings/types";
import {
  CALLER_PENALTY,
  LAYOUT_SIZE,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

const opponentName = "Robin";

export const tutorial: Strings["tutorial"] = {
  names: { player: "Gast", opponent: opponentName },
  open: "Tutorial",
  skip: "Tutorial überspringen",
  start: "Übungsrunde starten",
  intro: {
    title: "Dein Ziel",
    text: `Jede Karte ist so viel wert, wie die Zahl darauf zeigt. Wer die niedrigste Summe in seiner Auslage hat, gewinnt. Du hast ${String(LAYOUT_SIZE)} verdeckte Karten und darfst sie nur ab und zu ansehen. Dein Gedächtnis ist also dein bestes Werkzeug. Die Karten gehen von ${String(lowestCardValue)} bis ${String(highestCardValue)}; die ${powerValues} haben eine Fähigkeit. Spielen wir eine kurze Runde gegen ${opponentName}.`,
  },
  steps: {
    lookAtCards: {
      title: "Sieh dir deine Karten an",
      text: `Klicke auf die ${String(STARTING_VIEW_CARD_COUNT)} Karten links, um sie anzusehen. Das ist der einzige freie Blick; später helfen nur noch Fähigkeiten. Merk sie dir!`,
    },
    remember: {
      title: "Merk sie dir",
      text: `Die Karten werden wieder verdeckt. Merk dir, welche hoch und welche niedrig waren. ${opponentName} macht sich auch bereit.`,
    },
    draw: {
      title: "Ziehe eine Karte",
      text: "Du bist dran. Klicke auf den Nachziehstapel, um die oberste Karte zu ziehen. Nur du siehst sie.",
    },
    keep: {
      title: "Behalte die gezogene Karte",
      text: "Eine niedrige Karte, super! Wähle die höchste Karte, die du kennst, und klicke auf den Ablagestapel: Die ersetzte Karte landet dort. (Im echten Spiel dürftest du die gezogene Karte auch ablegen.)",
    },
    watchOpponent: {
      title: "Zug des Gegners",
      text: `${opponentName} ist am Zug. Die oberste Karte des Ablagestapels sehen alle, behalte sie im Blick.`,
    },
    drawAgain: {
      title: "Nochmal ziehen",
      text: "Klicke auf den Nachziehstapel noch einmal.",
    },
    viewOwn: {
      title: cardActionNames.viewOwn,
      text: `Diese Karte hat eine Fähigkeit. ${cardActionDescriptions.viewOwn} Klicke auf die gezogene Karte, dann auf die erste Karte, die du noch nicht kennst.`,
    },
    viewOther: {
      title: cardActionNames.viewOther,
      text: (position: number) =>
        `Noch eine Fähigkeit. ${cardActionDescriptions.viewOther} Klicke auf die gezogene Karte, dann auf die Karte von ${opponentName} an Position ${String(position)} von links.`,
    },
    exchangeBlind: {
      title: cardActionNames.exchangeBlind,
      text: (position: number) =>
        `${cardActionDescriptions.exchangeBlind} Klicke auf die gezogene Karte, dann auf deine hohe Karte und auf die niedrige Karte von ${opponentName} an Position ${String(position)}. Gib die hohe Karte ab!`,
    },
    groupReplace: {
      title: "Eine Gruppe ersetzen",
      text: "Zwei deiner Karten zeigen dieselbe Zahl. Wähle beide und klicke auf den Ablagestapel: Die gezogene Karte ersetzt beide, du hast eine Karte weniger. Liegst du falsch, verlierst du nur die gezogene Karte.",
    },
    takeDiscard: {
      title: "Vom Ablagestapel nehmen",
      text: `${opponentName} hat blind eine niedrige Karte weggetauscht! Klicke auf den Ablagestapel, wähle deine unbekannte Karte und klicke erneut auf den Stapel. Genommene Karten müssen in deine Auslage.`,
    },
    callEnd: {
      title: "Ende ansagen",
      text: "Du kennst alle deine Karten und deine Summe ist niedrig. Sage statt einer Karte das Ende an: Klicke auf „Ende ansagen“ und bestätige.",
    },
    lastRound: {
      title: "Ein letzter Zug",
      text: "Alle anderen haben noch einen Zug. Dann werden alle Karten aufgedeckt und gezählt.",
    },
    results: {
      title: "Gut gemacht!",
      text: `Die niedrigste Summe gewinnt und zählt 0, die anderen zählen ihre Summe. Das Ende anzusagen ist eine Wette: Unterbietet dich jemand, bekommst du ${String(CALLER_PENALTY)} Punkte extra. Es gibt auch eine besondere Hand, siehe „Regeln“ unten.`,
    },
  },
  hints: {
    lookAtLeftCards: (count: number) =>
      `Sieh dir die ${String(count)} Karten links an.`,
    drawFirst: "Ziehe zuerst eine Karte: Klicke auf den Nachziehstapel.",
    keepHighest: (position: number) =>
      `Tausche sie gegen die höchste Karte, an die du dich erinnerst, an Position ${String(position)} von links.`,
    lookAtUnseen: (position: number) =>
      `Klicke auf die gezogene Karte noch einmal, dann sieh dir die erste unbekannte Karte an Position ${String(position)} von links an.`,
    lookAtOpponentCard: (position: number) =>
      `Klicke auf die gezogene Karte noch einmal, dann sieh dir die Karte von ${opponentName} an Position ${String(position)} von links an.`,
    exchangeHighCard: (ownPosition: number, opponentPosition: number) =>
      `Klicke auf die gezogene Karte noch einmal, dann tausche deine hohe Karte (Position ${String(ownPosition)}) gegen die Karte von ${opponentName} an Position ${String(opponentPosition)}, die du gerade gesehen hast.`,
    replaceGroup: (positions: readonly number[]) =>
      `Ersetze die Karten mit gleicher Zahl an den Positionen ${positions.join(" und ")} durch die gezogene Karte.`,
    takeLowDiscard: (position: number) =>
      `Nimm die oberste Karte des Ablagestapels und tausche sie gegen die unbekannte Karte an Position ${String(position)} von links.`,
    callEndNow:
      "Deine Summe ist niedrig genug. Klicke auf „Ende ansagen“ und bestätige.",
  },
};
