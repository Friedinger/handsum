import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { useGameSession } from "@/composables/useGameSession";
import type { HelloMessage } from "@/net/protocol";
import type { Transport, TransportHandlers } from "@/net/transport";
import { mountComposable } from "@test/support/mountComposable";

const self: HelloMessage = { playerId: "alice", name: "Alice" };
const hoisted = vi.hoisted(() => ({
  handlers: undefined as TransportHandlers | undefined,
  leave: vi.fn(),
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
      leave: hoisted.leave,
    };
  },
}));

function connectedHandlers(): TransportHandlers {
  if (!hoisted.handlers) {
    throw new Error("The session did not connect");
  }
  return hoisted.handlers;
}

describe("useGameSession", () => {
  beforeEach(() => {
    hoisted.handlers = undefined;
    hoisted.leave.mockClear();
  });

  it("starts connecting with the player alone", () => {
    const { result } = mountComposable(() => useGameSession("ABCDEF", self));

    expect(result.snapshot.value).toMatchObject({
      roomCode: "ABCDEF",
      connection: "connecting",
      joinRefused: false,
    });
  });

  it("follows the changes reported by the transport", () => {
    const { result } = mountComposable(() => useGameSession("ABCDEF", self));

    connectedHandlers().onConnectionChange("online");
    connectedHandlers().onJoinRefusedChange(true);

    expect(result.snapshot.value).toMatchObject({
      connection: "online",
      joinRefused: true,
    });
  });

  it("remembers why a move was rejected until the log changes", async () => {
    const { result } = mountComposable(() => useGameSession("ABCDEF", self));

    result.submitMove({ type: "callEnd", playerId: "alice" });
    expect(result.lastRejection.value).toBe("gameNotStarted");

    connectedHandlers().onUpdate({
      firstIndex: 0,
      moves: [],
      players: [self],
    });
    await nextTick();
    expect(result.lastRejection.value).toBe("gameNotStarted");
  });

  it("leaves the room when unmounted", () => {
    const { unmount } = mountComposable(() => useGameSession("ABCDEF", self));

    unmount();

    expect(hoisted.leave).toHaveBeenCalledOnce();
  });
});
