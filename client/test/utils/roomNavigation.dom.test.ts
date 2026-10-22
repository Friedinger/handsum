import { afterEach, describe, expect, it, vi } from "vitest";

import { leaveRoom, openRoom, openTutorial } from "@/utils/roomNavigation";

describe("room navigation", () => {
  afterEach(() => {
    history.replaceState(null, "", "/");
  });

  it("opens a room through the URL hash", () => {
    openRoom("ABCDEF");

    expect(location.hash).toBe("#ABCDEF");
  });

  it("opens the tutorial through the URL hash", () => {
    openTutorial();

    expect(location.hash).toBe("#tutorial");
  });

  it("leaves the room by clearing the hash and announcing the change", () => {
    openRoom("ABCDEF");
    const onHashChange = vi.fn();
    window.addEventListener("hashchange", onHashChange);

    leaveRoom();

    expect(location.hash).toBe("");
    expect(onHashChange).toHaveBeenCalledOnce();
    window.removeEventListener("hashchange", onHashChange);
  });
});
