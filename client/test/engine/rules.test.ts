import { describe, expect, it } from "vitest";

import { isValidPlayerName, PLAYER_NAME_MAX_LENGTH } from "@/engine/rules";

describe("isValidPlayerName", () => {
  it.each([
    "A",
    "Anna",
    "Zoë",
    "Jean-Luc",
    "O'Brien",
    "O’Brien",
    "Max Mustermann",
    "李雷",
    "Player_1.2",
    "a".repeat(PLAYER_NAME_MAX_LENGTH),
  ])("accepts %s", (name) => {
    expect(isValidPlayerName(name)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["leading space", " Anna"],
    ["trailing space", "Anna "],
    ["too long", "a".repeat(PLAYER_NAME_MAX_LENGTH + 1)],
    ["markup", "<b>Anna</b>"],
    ["line break", "Anna\n"],
    ["direction override", "Eve\u202E"],
    ["zero-width space", "Zero\u200Bwidth"],
    ["emoji", "Anna 😀"],
    ["leading separator", "-Anna"],
  ])("rejects %s", (_description, name) => {
    expect(isValidPlayerName(name)).toBe(false);
  });
});
