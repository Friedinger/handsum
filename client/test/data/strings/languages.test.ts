import { describe, expect, it } from "vitest";

import { de } from "@/data/strings/de";
import { en } from "@/data/strings/en";

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
});
