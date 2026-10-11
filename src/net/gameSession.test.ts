import { describe, expect, it } from "vitest";
import type { Move } from "../engine";
import {
  createGameSession,
  lobbyPlayers,
  type GameSession,
  type SessionSnapshot,
} from "./gameSession";
import { createMemoryNetwork, type MemoryNetwork } from "./memoryNetwork";
import type { HelloMessage } from "./protocol";

const ROOM = "ABCDEF";
const SEED = 7;
const alice: HelloMessage = { playerId: "alice", name: "Alice", isHost: true };
const bob: HelloMessage = { playerId: "bob", name: "Bob", isHost: false };
const carol: HelloMessage = { playerId: "carol", name: "Carol", isHost: false };

interface Client {
  readonly session: GameSession;
  readonly latest: () => SessionSnapshot;
}

function join(network: MemoryNetwork, self: HelloMessage): Client {
  let latest: SessionSnapshot | null = null;
  const session = createGameSession({
    roomCode: ROOM,
    self,
    connect: network.connect,
    onChange: (snapshot) => {
      latest = snapshot;
    },
  });
  return {
    session,
    latest: () => {
      if (!latest) {
        throw new Error("No snapshot yet");
      }
      return latest;
    },
  };
}

function startedRoom() {
  const network = createMemoryNetwork();
  const host = join(network, alice);
  const guest = join(network, bob);
  network.deliverAll();
  host.session.startGame(SEED);
  network.deliverAll();
  return { network, host, guest };
}

const ready = (playerId: string): Move => ({ type: "ready", playerId });

describe("game session", () => {
  it("lists everyone in the lobby with the host first", () => {
    const network = createMemoryNetwork();
    const host = join(network, alice);
    join(network, bob);
    network.deliverAll();
    expect(lobbyPlayers(host.latest())).toEqual([
      { id: "alice", name: "Alice" },
      { id: "bob", name: "Bob" },
    ]);
  });

  it("lets only the host start, and shares the start with everyone", () => {
    const network = createMemoryNetwork();
    join(network, alice);
    const guest = join(network, bob);
    network.deliverAll();
    expect(guest.session.startGame(SEED)).toBe("notHost");
    const { guest: startedGuest } = startedRoom();
    expect(startedGuest.latest().log.state.status).toBe("started");
  });

  it("keeps both clients in sync when players get ready at the same time", () => {
    const { network, host, guest } = startedRoom();
    host.session.submitMove(ready("alice"));
    guest.session.submitMove(ready("bob"));
    network.deliverAll();
    expect(host.latest().log.state).toEqual(guest.latest().log.state);
    const { state } = host.latest().log;
    expect(state.status === "started" && state.phase.kind).toBe("playing");
  });

  it("rejects local moves the rules do not allow", () => {
    const { guest } = startedRoom();
    expect(guest.session.submitMove({ type: "drawFromDeck", playerId: "bob" })).toBe("wrongPhase");
  });

  it("restores the full game for a player who reloads", () => {
    const { network, host, guest } = startedRoom();
    host.session.submitMove(ready("alice"));
    network.deliverAll();
    guest.session.leave();
    const rejoined = join(network, bob);
    network.deliverAll();
    expect(rejoined.latest().log.moves).toEqual(host.latest().log.moves);
    expect(rejoined.latest().peers.map((peer) => peer.hello.playerId)).toEqual(["alice"]);
  });

  it("catches up a client that missed moves while still connected", () => {
    const { network, host, guest } = startedRoom();
    const latecomer = join(network, carol);
    network.deliverAll();
    host.session.submitMove(ready("alice"));
    guest.session.submitMove(ready("bob"));
    network.deliverAll();
    expect(latecomer.latest().log.state).toEqual(host.latest().log.state);
  });
});
