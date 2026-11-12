import type { DevModeStrings } from "@/data/strings/types";

export const devMode: DevModeStrings = {
  open: "Testmodus",
  title: "Testmodus",
  intro: "Offline gegen Bots spielen. Nur auf dem Dev-Server verfügbar.",
  playerCount: "Spieler",
  names: "Namen",
  nameOf: (seat: number) =>
    seat === 1 ? "Dein Name" : `Name von Bot ${String(seat - 1)}`,
  defaultNames: [
    "Alex",
    "Robin",
    "Bartholomäus",
    "Zoë",
    "Jo",
    "Jörg O’Brien",
    "Maximiliane-Sophie",
    "Anna-Lena Schmidt-Berger",
  ],
  botSpeed: "Bot-Tempo",
  speeds: { instant: "Sofort", fast: "Schnell", normal: "Normal" },
  start: "Spiel starten",
  invalidNames: "Jeder Spieler braucht einen gültigen Namen.",
  endRound: "Runde beenden",
  endRequested: "Der nächste Bot sagt das Ende an.",
  settings: "Einstellungen",
};
