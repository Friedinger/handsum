import { describe, expect, it } from "vitest";
import { startedGame } from "@test/support/gameFixtures";
import { arrangeOpponents, opponentsInTurnOrder } from "@/utils/tableLayout";

function namesAround(playerCount: number, selfId: string) {
  const sides = arrangeOpponents(startedGame(playerCount).seats, selfId);
  const ids = (seats: typeof sides.left) =>
    seats.map((seat) => seat.player.id.replace("player-", ""));
  return {
    left: ids(sides.left),
    top: ids(sides.top),
    right: ids(sides.right),
  };
}

describe("opponentsInTurnOrder", () => {
  it("lists the other players starting with the next one", () => {
    const ids = opponentsInTurnOrder(startedGame(4).seats, "player-3").map(
      (seat) => seat.player.id,
    );
    expect(ids).toEqual(["player-4", "player-1", "player-2"]);
  });
});

describe("arrangeOpponents", () => {
  it("puts a single opponent at the top", () => {
    expect(namesAround(2, "player-1")).toEqual({
      left: [],
      top: ["2"],
      right: [],
    });
  });

  it("puts two opponents on the sides", () => {
    expect(namesAround(3, "player-1")).toEqual({
      left: ["2"],
      top: [],
      right: ["3"],
    });
  });

  it("fills left, top and right clockwise for larger tables", () => {
    expect(namesAround(4, "player-1")).toEqual({
      left: ["2"],
      top: ["3"],
      right: ["4"],
    });
    expect(namesAround(8, "player-1")).toEqual({
      left: ["3", "2"],
      top: ["4", "5", "6"],
      right: ["7", "8"],
    });
  });

  it("seats everyone but the own player exactly once", () => {
    for (let playerCount = 2; playerCount <= 8; playerCount++) {
      const { left, top, right } = namesAround(playerCount, "player-2");
      expect([...left, ...top, ...right].sort()).toEqual(
        Array.from({ length: playerCount }, (_, index) => String(index + 1))
          .filter((id) => id !== "2")
          .sort(),
      );
    }
  });
});
