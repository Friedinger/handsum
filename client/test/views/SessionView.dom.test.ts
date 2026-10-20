import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { strings } from "@/data/strings";
import type { HelloMessage } from "@/net/protocol";
import type { Transport, TransportHandlers } from "@/net/transport";
import SessionView from "@/views/SessionView.vue";
import { startGameMove } from "@test/support/gameFixtures";

const self: HelloMessage = { playerId: "alice", name: "Alice" };
const hoisted = vi.hoisted(() => ({
  handlers: undefined as TransportHandlers | undefined,
}));

vi.mock("@/net/pollingTransport", () => ({
  connectPolling: (
    _roomCode: string,
    _self: HelloMessage,
    handlers: TransportHandlers,
  ): Transport => {
    hoisted.handlers = handlers;
    return {
      appendMove: () => Promise.resolve({ kind: "failed" }),
      refresh: () => Promise.resolve(),
      leave: () => undefined,
    };
  },
}));

function mountSession() {
  return mount(SessionView, { props: { roomCode: "ABCDEF", self } });
}

function connectedHandlers(): TransportHandlers {
  if (!hoisted.handlers) {
    throw new Error("The session did not connect");
  }
  return hoisted.handlers;
}

describe("SessionView", () => {
  beforeEach(() => {
    hoisted.handlers = undefined;
  });

  it("shows the lobby before a game started", () => {
    const wrapper = mountSession();

    expect(wrapper.text()).toContain(strings.lobby.title("ABCDEF"));
  });

  it("warns while the server cannot be reached", async () => {
    const wrapper = mountSession();

    connectedHandlers().onConnectionChange("offline");
    await nextTick();

    expect(wrapper.text()).toContain(strings.connection.offline);
  });

  it("tells a player that the room is full instead of showing the lobby", async () => {
    const wrapper = mountSession();

    connectedHandlers().onJoinRefusedChange(true);
    await nextTick();

    expect(wrapper.text()).toContain(strings.roomFull.notice);
    expect(wrapper.text()).not.toContain(strings.lobby.title("ABCDEF"));
  });

  it("shows the lobby again once a seat became free", async () => {
    const wrapper = mountSession();
    connectedHandlers().onJoinRefusedChange(true);
    await nextTick();

    connectedHandlers().onJoinRefusedChange(false);
    await nextTick();

    expect(wrapper.text()).toContain(strings.lobby.title("ABCDEF"));
  });

  it("keeps players out of a game they do not belong to", async () => {
    const wrapper = mountSession();

    connectedHandlers().onUpdate({
      firstIndex: 0,
      moves: [startGameMove(3)],
      players: [self],
    });
    await nextTick();

    expect(wrapper.text()).toContain(strings.spectator.notice);
  });
});
