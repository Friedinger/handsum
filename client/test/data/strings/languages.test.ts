import { describe, expect, it } from "vitest";

import { de } from "@/data/strings/de";
import { devMode as deDevMode } from "@/data/strings/de/devMode";
import { en } from "@/data/strings/en";
import { devMode as enDevMode } from "@/data/strings/en/devMode";

function shapeOf(value: unknown): unknown {
  if (typeof value === "function") {
    return `function/${String(value.length)}`;
  }
  if (Array.isArray(value)) {
    return value.map(shapeOf);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, shapeOf(entry)]),
    );
  }
  return typeof value;
}

describe("languages", () => {
  it("German has the same structure as the English reference", () => {
    expect(shapeOf(de)).toEqual(shapeOf(en));
  });

  it("German has the same test mode texts as the English reference", () => {
    expect(shapeOf(deDevMode)).toEqual(shapeOf(enDevMode));
  });
});
