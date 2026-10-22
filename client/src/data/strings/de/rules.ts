import {
  cardActionDescriptions,
  cardActionNames,
} from "@/data/strings/de/cardActions";
import { deckOverview } from "@/data/strings/de/deckOverview";
import type { Strings } from "@/data/strings/types";
import {
  CALLER_PENALTY,
  LAYOUT_SIZE,
  SPECIAL_LAYOUT_PENALTY,
  SPECIAL_LAYOUT_VALUES,
  STARTING_VIEW_CARD_COUNT,
} from "@/engine";

const rulesSections: Strings["rules"]["sections"] = [
  {
    heading: "So wird gewertet",
    items: [
      "Jede Karte ist so viel wert, wie die Zahl darauf zeigt. Nach dem Spiel zählt jeder die Karten seiner Auslage zusammen.",
      "Die niedrigste Summe gewinnt und zählt 0 Punkte. Teilen sich mehrere Spieler die niedrigste Summe, gewinnen alle.",
      "Alle anderen bekommen ihre Summe als Punkte.",
      `Das Ende anzusagen ist eine Wette: Hat jemand am Ende eine niedrigere Summe als der Spieler, der das Ende angesagt hat, bekommt dieser ${String(CALLER_PENALTY)} Punkte zusätzlich. Liegt er nur gleichauf mit der niedrigsten Summe, gewinnt er allein.`,
      `Eine besondere Hand schlägt alle anderen: ${SPECIAL_LAYOUT_VALUES.join(", ")}. Wer am Ende genau diese Karten hat, gewinnt, und jeder Gegner bekommt ${String(SPECIAL_LAYOUT_PENALTY)} Punkte, egal wie niedrig seine Summe ist.`,
    ],
  },
  {
    heading: "Die Karten",
    paragraphs: [deckOverview.total],
    facts: deckOverview.facts,
  },
  {
    heading: "Deine Auslage",
    items: [
      `Deine ${String(LAYOUT_SIZE)} verdeckten Karten liegen in einer Reihe und bewegen sich nur, wenn du eine davon austauschst.`,
      `Deine eigenen Karten siehst du nur selten: ${String(STARTING_VIEW_CARD_COUNT)} davon zu Beginn, danach nur noch durch eine Fähigkeit.`,
    ],
  },
  {
    heading: "Die beiden Stapel",
    items: [
      "Nachziehstapel: verdeckt. Wer die oberste Karte zieht, sieht sie als Einziger.",
      "Ablagestapel: offen. Alle sehen die oberste Karte.",
    ],
  },
  {
    heading: "Dein Zug",
    paragraphs: ["Wähle genau eines:"],
    items: [
      "Ziehe eine Karte. Dann nutze ihre Fähigkeit, falls sie eine hat, oder behalte sie oder lege sie ab. Behalten heißt: Sie kommt anstelle einer Karte in deine Auslage, und diese Karte landet auf dem Ablagestapel. Ablegen heißt: Sie geht direkt auf den Ablagestapel.",
      "Nimm die sichtbare oberste Karte des Ablagestapels. Sie muss anstelle einer Karte in deine Auslage.",
      "Sage stattdessen das Ende des Spiels an.",
    ],
  },
  {
    heading: "Das Spiel beenden",
    paragraphs: [
      "Glaubst du, du hast die niedrigste Summe? Nutze deinen Zug, um das Ende anzusagen. Alle anderen haben noch einen Zug, danach werden alle Karten aufgedeckt.",
    ],
  },
  {
    heading: "Fähigkeiten",
    items: [
      "Eine Fähigkeit kannst du nur mit einer Karte nutzen, die du gerade vom Nachziehstapel gezogen hast.",
      "Du musst sie sofort nutzen, danach geht die Karte auf den Ablagestapel.",
      "Eine gezogene Karte, deren Fähigkeit du nicht nutzt, ist eine gewöhnliche Zahlenkarte.",
      "Karten vom Ablagestapel und aus deiner Auslage haben nie eine Fähigkeit.",
      `${cardActionNames.viewOwn}: ${cardActionDescriptions.viewOwn}`,
      `${cardActionNames.viewOther}: ${cardActionDescriptions.viewOther}`,
      `${cardActionNames.exchangeBlind}: ${cardActionDescriptions.exchangeBlind}`,
    ],
  },
  {
    heading: "Eine Gruppe ersetzen",
    paragraphs: [
      "Die Karte, die in deine Auslage kommt, darf den Platz von zwei, drei oder allen vier Karten auf einmal einnehmen, wenn du glaubst, dass sie dieselbe Zahl tragen.",
      "Bevor sich etwas bewegt, wird die Gruppe allen gezeigt. Bei einem falschen Tipp ändert sich deine Auslage nicht: Die neue Karte geht auf den Ablagestapel und dein Zug endet. Bei einem richtigen Tipp geht die ganze Gruppe auf den Ablagestapel und die neue Karte nimmt ihren Platz ein, deine Auslage wird also kleiner.",
      "Beispiel: Du erinnerst dich an drei Neunen. Wähle alle drei und lege die neue Karte dorthin. Dann bleiben zwei Karten in deiner Auslage.",
    ],
  },
];

export const rules: Strings["rules"] = {
  open: "Regeln",
  title: "Regeln",
  close: "Schließen",
  sections: rulesSections,
};
