export const devMode = {
  open: "Test mode",
  title: "Test mode",
  intro: "Play offline against bots. Only available on the dev server.",
  playerCount: "Players",
  names: "Names",
  nameOf: (seat: number) =>
    seat === 1 ? "Your name" : `Name of bot ${String(seat - 1)}`,
  /** One per seat: short, long and maximum-length names with special characters, so layout problems show up. */
  defaultNames: [
    "Alex",
    "Robin",
    "Bartholomew",
    "Zoë",
    "Jo",
    "Seán O’Connor",
    "Mary-Elizabeth",
    "Charlotte Ashby-Whitmore",
  ],
  botSpeed: "Bot speed",
  speeds: { instant: "Instant", fast: "Fast", normal: "Normal" },
  start: "Start game",
  invalidNames: "Every player needs a valid name.",
  endRound: "End round",
  settings: "Settings",
} as const;
