import { afterEach, describe, expect, it } from "vitest";

import { useRoomCode } from "@/composables/useRoomCode";

import { mountComposable } from "@test/support/mountComposable";

function changeHash(hash: string): void {
  location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("useRoomCode", () => {
  afterEach(() => {
    history.replaceState(null, "", "/");
  });

  it("starts without a room when the hash is empty", () => {
    const { result } = mountComposable(useRoomCode);

    expect(result.value).toBeNull();
  });

  it("reads the room code from the hash", () => {
    location.hash = "abcdef";

    const { result } = mountComposable(useRoomCode);

    expect(result.value).toBe("ABCDEF");
  });

  it("follows hash changes and ignores invalid codes", () => {
    const { result } = mountComposable(useRoomCode);

    changeHash("GHJKMN");
    expect(result.value).toBe("GHJKMN");

    changeHash("nope");
    expect(result.value).toBeNull();
  });

  it("stops listening after unmounting", () => {
    const { result, unmount } = mountComposable(useRoomCode);
    unmount();

    changeHash("GHJKMN");

    expect(result.value).toBeNull();
  });
});
