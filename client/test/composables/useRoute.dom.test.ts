import { afterEach, describe, expect, it } from "vitest";

import { parseRoute, useRoute } from "@/composables/useRoute";

import { mountComposable } from "@test/support/mountComposable";

function changeHash(hash: string): void {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("parseRoute", () => {
  it("recognises the home page, the tutorial and rooms", () => {
    expect(parseRoute("")).toEqual({ kind: "home" });
    expect(parseRoute("#tutorial")).toEqual({ kind: "tutorial" });
    expect(parseRoute("#abcdef")).toEqual({ kind: "room", roomCode: "ABCDEF" });
  });

  it("falls back to the home page for anything else", () => {
    expect(parseRoute("#nope")).toEqual({ kind: "home" });
  });
});

describe("useRoute", () => {
  afterEach(() => {
    history.replaceState(null, "", "/");
  });

  it("starts on the home page when the hash is empty", () => {
    const { result } = mountComposable(useRoute);

    expect(result.value).toEqual({ kind: "home" });
  });

  it("reads the room code from the hash", () => {
    location.hash = "abcdef";

    const { result } = mountComposable(useRoute);

    expect(result.value).toEqual({ kind: "room", roomCode: "ABCDEF" });
  });

  it("follows hash changes and ignores invalid codes", () => {
    const { result } = mountComposable(useRoute);

    changeHash("GHJKMN");
    expect(result.value).toEqual({ kind: "room", roomCode: "GHJKMN" });

    changeHash("tutorial");
    expect(result.value).toEqual({ kind: "tutorial" });

    changeHash("nope");
    expect(result.value).toEqual({ kind: "home" });
  });

  it("stops listening after unmounting", () => {
    const { result, unmount } = mountComposable(useRoute);
    unmount();

    changeHash("GHJKMN");

    expect(result.value).toEqual({ kind: "home" });
  });
});
