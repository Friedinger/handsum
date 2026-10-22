import { describe, expect, it } from "vitest";

import { pickLanguage } from "@/utils/pickLanguage";

describe("pickLanguage", () => {
  it("prefers the saved choice over the browser languages", () => {
    expect(pickLanguage(["de-DE"], "en")).toBe("en");
    expect(pickLanguage(["en-US"], "de")).toBe("de");
  });

  it("uses the browser language without a saved choice", () => {
    expect(pickLanguage(["de-AT", "en"], null)).toBe("de");
    expect(pickLanguage(["EN-gb"], null)).toBe("en");
  });

  it("takes the first offered language the app speaks", () => {
    expect(pickLanguage(["fr-FR", "de"], null)).toBe("de");
  });

  it("falls back to English", () => {
    expect(pickLanguage(["fr", "ja"], null)).toBe("en");
    expect(pickLanguage([], null)).toBe("en");
  });

  it("ignores a saved value that is no language", () => {
    expect(pickLanguage(["de"], "fr")).toBe("de");
    expect(pickLanguage(["fr"], "")).toBe("en");
  });
});
