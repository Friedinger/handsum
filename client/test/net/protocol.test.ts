import { describe, expect, it } from "vitest";

import { parseHello, parsePlayers, parseRoomSnapshot } from "@/net/protocol";

const alice = { playerId: "a", name: "Alice" };
const drawMove = { type: "drawFromDeck", playerId: "a" };

describe("parseHello", () => {
  it("keeps only the player ID and name", () => {
    expect(parseHello({ ...alice, extra: 1 })).toEqual(alice);
  });

  it.each([null, "alice", [], { playerId: "a" }, { playerId: 1, name: "A" }])(
    "rejects %j",
    (value) => {
      expect(parseHello(value)).toBeNull();
    },
  );
});

describe("parsePlayers", () => {
  it("reads the players of a reply", () => {
    expect(parsePlayers({ players: [alice] })).toEqual([alice]);
  });

  it("rejects replies with a missing list or an invalid entry", () => {
    expect(parsePlayers({})).toBeNull();
    expect(parsePlayers({ players: [alice, { name: "B" }] })).toBeNull();
  });
});

describe("parseRoomSnapshot", () => {
  it("reads length, moves and players", () => {
    expect(
      parseRoomSnapshot({ length: 1, moves: [drawMove], players: [alice] }),
    ).toEqual({ length: 1, moves: [drawMove], players: [alice] });
  });

  it.each([
    ["a missing length", { moves: [], players: [] }],
    ["an unknown move", { length: 1, moves: [{ type: "cheat" }], players: [] }],
    ["invalid players", { length: 0, moves: [], players: [1] }],
    ["a non-object", "snapshot"],
  ])("rejects %s", (_, value) => {
    expect(parseRoomSnapshot(value)).toBeNull();
  });
});
