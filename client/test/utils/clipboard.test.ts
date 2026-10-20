import { afterEach, describe, expect, it, vi } from "vitest";

import { copyText } from "@/utils/clipboard";

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes the text to the clipboard", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    expect(await copyText("https://example.com/#ABCDEF")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/#ABCDEF");
  });

  it("reports a refused write", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: () => Promise.reject(new Error("denied")) },
    });

    expect(await copyText("text")).toBe(false);
  });

  it("reports a missing clipboard", async () => {
    vi.stubGlobal("navigator", {});

    expect(await copyText("text")).toBe(false);
  });
});
