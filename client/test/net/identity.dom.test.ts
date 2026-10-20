import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const PLAYER_ID_KEY = "handsum.playerId";

interface LockStub {
  readonly held: Set<string>;
  readonly request: (
    name: string,
    options: unknown,
    callback: (lock: object | null) => unknown,
  ) => Promise<unknown>;
}

function installLocks(): LockStub {
  const held = new Set<string>();
  const request: LockStub["request"] = (name, _options, callback) => {
    if (held.has(name)) {
      return Promise.resolve(callback(null));
    }
    held.add(name);
    return Promise.resolve(callback({ name }));
  };
  vi.stubGlobal("navigator", { locks: { request } });
  return { held, request };
}

async function loadIdentity() {
  vi.resetModules();
  return import("@/net/identity");
}

describe("player identity", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("player name", () => {
    it("is empty until a name was saved", async () => {
      const { loadPlayerName } = await loadIdentity();

      expect(loadPlayerName()).toBe("");
    });

    it("is kept in the tab and shared with other tabs", async () => {
      const { loadPlayerName, savePlayerName } = await loadIdentity();

      savePlayerName("Anna");

      expect(sessionStorage.getItem("handsum.playerName")).toBe("Anna");
      expect(localStorage.getItem("handsum.playerName")).toBe("Anna");
      expect(loadPlayerName()).toBe("Anna");
    });

    it("prefers the name of the own tab", async () => {
      const { loadPlayerName } = await loadIdentity();
      localStorage.setItem("handsum.playerName", "Shared");
      sessionStorage.setItem("handsum.playerName", "Own");

      expect(loadPlayerName()).toBe("Own");
    });
  });

  describe("joined room", () => {
    it("is remembered per tab and room", async () => {
      const { hasJoinedRoom, rememberJoinedRoom } = await loadIdentity();

      rememberJoinedRoom("ABCDEF");

      expect(hasJoinedRoom("ABCDEF")).toBe(true);
      expect(hasJoinedRoom("GHJKMN")).toBe(false);
    });
  });

  describe("player ID", () => {
    it("is created once and stored for the tab and the browser", async () => {
      installLocks();
      const { claimPlayerId } = await loadIdentity();

      const playerId = await claimPlayerId();

      expect(playerId).toMatch(/^[0-9a-f-]{36}$/);
      expect(sessionStorage.getItem(PLAYER_ID_KEY)).toBe(playerId);
      expect(localStorage.getItem(PLAYER_ID_KEY)).toBe(playerId);
    });

    it("is only claimed once per page load", async () => {
      installLocks();
      const { claimPlayerId } = await loadIdentity();

      expect(await claimPlayerId()).toBe(await claimPlayerId());
    });

    it("is reused when the browser already has one", async () => {
      installLocks();
      localStorage.setItem(PLAYER_ID_KEY, "known-player");
      const { claimPlayerId } = await loadIdentity();

      expect(await claimPlayerId()).toBe("known-player");
    });

    it("is not shared with another live tab", async () => {
      const locks = installLocks();
      localStorage.setItem(PLAYER_ID_KEY, "known-player");
      locks.held.add("handsum.player.known-player");
      const { claimPlayerId } = await loadIdentity();

      const playerId = await claimPlayerId();

      expect(playerId).not.toBe("known-player");
      expect(localStorage.getItem(PLAYER_ID_KEY)).toBe("known-player");
      expect(sessionStorage.getItem(PLAYER_ID_KEY)).toBe(playerId);
    });

    it("works without the Web Locks API", async () => {
      vi.stubGlobal("navigator", {});
      localStorage.setItem(PLAYER_ID_KEY, "known-player");
      const { claimPlayerId } = await loadIdentity();

      expect(await claimPlayerId()).toBe("known-player");
    });

    it("still works when the storage refuses to write", async () => {
      installLocks();
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      const { claimPlayerId } = await loadIdentity();

      expect(await claimPlayerId()).toMatch(/^[0-9a-f-]{36}$/);
      vi.restoreAllMocks();
    });
  });
});
