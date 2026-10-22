import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import { strings } from "@/data/strings";
import { MAX_PLAYERS, MIN_PLAYERS, type MoveRejection } from "@/engine";
import { initialSnapshot, type SessionSnapshot } from "@/net/gameSession";
import type { HelloMessage } from "@/net/protocol";
import LobbyView from "@/views/LobbyView.vue";

const self: HelloMessage = { playerId: "alice", name: "Alice" };

function snapshotWith(others: readonly string[]): SessionSnapshot {
  return {
    ...initialSnapshot("ABCDEF", self),
    players: [
      self,
      ...others.map((name) => ({ playerId: name.toLowerCase(), name })),
    ],
  };
}

function mountLobby(
  snapshot: SessionSnapshot,
  rejection: MoveRejection | null = null,
) {
  return mount(LobbyView, { props: { snapshot, rejection } });
}

function startButton(wrapper: ReturnType<typeof mountLobby>) {
  return wrapper.find("button.button-primary");
}

describe("LobbyView", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("lists the players and marks the own one", () => {
    const wrapper = mountLobby(snapshotWith(["Ben"]));

    const items = wrapper.findAll(".player-list li").map((li) => li.text());

    expect(items).toEqual([`Alice (${strings.table.you})`, "Ben"]);
  });

  it("cannot start alone and says how many players are needed", () => {
    const wrapper = mountLobby(snapshotWith([]));

    expect(startButton(wrapper).attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain(
      strings.lobby.playerLimits(MIN_PLAYERS, MAX_PLAYERS),
    );
  });

  it("lets anyone start once enough players are there", async () => {
    const wrapper = mountLobby(snapshotWith(["Ben"]));

    await startButton(wrapper).trigger("click");

    expect(startButton(wrapper).attributes("disabled")).toBeUndefined();
    expect(wrapper.emitted("start")).toHaveLength(1);
  });

  it("shows why a start was rejected", () => {
    const wrapper = mountLobby(snapshotWith(["Ben"]), "invalidSeed");

    expect(wrapper.text()).toContain(strings.rejectionMessages.invalidSeed);
  });

  it("confirms a copied link for a moment", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const wrapper = mountLobby(snapshotWith([]));
    const copy = wrapper.find(".inline-form button");

    await copy.trigger("click");
    await vi.advanceTimersByTimeAsync(0);
    expect(copy.text()).toBe(strings.lobby.copied);
    await vi.advanceTimersByTimeAsync(2000);

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#ABCDEF"));
    expect(copy.text()).toBe(strings.lobby.copyLink);
  });

  it("restarts the confirmation time when the link is copied again", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
    const wrapper = mountLobby(snapshotWith([]));
    const copy = wrapper.find(".inline-form button");

    await copy.trigger("click");
    await vi.advanceTimersByTimeAsync(1500);
    await copy.trigger("click");
    await vi.advanceTimersByTimeAsync(1500);
    expect(copy.text()).toBe(strings.lobby.copied);
    await vi.advanceTimersByTimeAsync(500);

    expect(copy.text()).toBe(strings.lobby.copyLink);
  });

  it("leaves no timer behind when unmounted", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
    });
    const wrapper = mountLobby(snapshotWith([]));

    await wrapper.find(".inline-form button").trigger("click");
    await vi.advanceTimersByTimeAsync(0);
    wrapper.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("offers sharing only where the browser can share", () => {
    const buttonLabels = () =>
      mountLobby(snapshotWith([]))
        .findAll("button")
        .map((button) => button.text());

    vi.stubGlobal("navigator", {});
    expect(buttonLabels()).not.toContain(strings.lobby.share);

    vi.stubGlobal("navigator", { share: vi.fn() });
    expect(buttonLabels()).toContain(strings.lobby.share);
  });

  it("shares the room link", async () => {
    const share = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { share });
    const wrapper = mountLobby(snapshotWith([]));

    await wrapper.find(".inline-form button").trigger("click");

    expect(share).toHaveBeenCalledWith({
      url: expect.stringContaining("#ABCDEF"),
      title: strings.lobby.shareTitle,
    });
  });

  it("copies the link instead when sharing fails", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", {
      share: () => Promise.reject(new Error("not allowed")),
      clipboard: { writeText },
    });
    const wrapper = mountLobby(snapshotWith([]));

    await wrapper.find(".inline-form button").trigger("click");

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalled();
    });
  });

  it("stays quiet when the player cancels sharing", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", {
      share: () => Promise.reject(new DOMException("", "AbortError")),
      clipboard: { writeText },
    });
    const wrapper = mountLobby(snapshotWith([]));

    await wrapper.find(".inline-form button").trigger("click");
    await Promise.resolve();

    expect(writeText).not.toHaveBeenCalled();
  });

  it("tells the player when copying is not possible", async () => {
    vi.stubGlobal("navigator", {});
    const wrapper = mountLobby(snapshotWith([]));

    await wrapper.find(".inline-form button").trigger("click");
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain(strings.lobby.copyFailed);
    });
  });
});
