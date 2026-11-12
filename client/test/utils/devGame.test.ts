import { describe, expect, it } from "vitest";

import { devMode as deDevMode } from "@/data/strings/de/devMode";
import { devMode as enDevMode } from "@/data/strings/en/devMode";
import { MAX_PLAYERS } from "@/engine";
import {
  defaultDevSettings,
  devPlayers,
  type DevSettings,
  hasValidNames,
  parseDevSettings,
} from "@/utils/devGame";

const defaults = defaultDevSettings(enDevMode.defaultNames);

function withNames(names: readonly string[], playerCount = 3): DevSettings {
  const padded = [...names, ...defaults.names.slice(names.length)];
  return { ...defaults, playerCount, names: padded };
}

describe("defaultDevSettings", () => {
  it.each([
    ["English", enDevMode.defaultNames],
    ["German", deDevMode.defaultNames],
  ])("prefills a valid %s name for every seat", (_, names) => {
    const settings = {
      ...defaultDevSettings(names),
      playerCount: MAX_PLAYERS,
    };

    expect(settings.names).toHaveLength(MAX_PLAYERS);
    expect(hasValidNames(settings)).toBe(true);
  });
});

describe("parseDevSettings", () => {
  it("restores saved settings", () => {
    const saved: DevSettings = {
      ...defaults,
      playerCount: 6,
      botSpeed: "instant",
    };

    expect(
      parseDevSettings(JSON.parse(JSON.stringify(saved)), defaults),
    ).toEqual(saved);
  });

  it("falls back to the defaults field by field", () => {
    const saved = { playerCount: 9, names: ["Only one"], botSpeed: "instant" };

    expect(parseDevSettings(saved, defaults)).toEqual({
      ...defaults,
      botSpeed: "instant",
    });
    expect(parseDevSettings("broken", defaults)).toBe(defaults);
  });
});

describe("hasValidNames", () => {
  it("checks only the names of the seats in play", () => {
    expect(hasValidNames(withNames(["A", "B", "  "]))).toBe(false);
    expect(hasValidNames(withNames(["A", "B", "C", ""]))).toBe(true);
  });
});

describe("devPlayers", () => {
  it("seats the trimmed names with the player at the screen first", () => {
    expect(devPlayers(withNames([" Me ", "Bot", "Other bot"]))).toEqual([
      { id: "dev-player-1", name: "Me" },
      { id: "dev-player-2", name: "Bot" },
      { id: "dev-player-3", name: "Other bot" },
    ]);
  });
});
