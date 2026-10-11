import { describe, expect, it } from "vitest";
import { applyMove, type Move, type StartedGame } from "../engine";
import {
  expectStarted,
  holding,
  makeCard,
  playingGame,
  withLayouts,
} from "../engine/testFixtures";
import { anchorKey, planDeal, planMove, type MovePlan } from "./cardFlights";

const self = "player-1";

function plan(previous: StartedGame, move: Move, viewer = self): MovePlan {
  return planMove(
    previous,
    move,
    expectStarted(applyMove(previous, move)),
    viewer,
  );
}

function routes(movePlan: MovePlan): string[] {
  return movePlan.flights.map(
    (flight) =>
      `${anchorKey(flight.from)} -> ${anchorKey(flight.to)} @${String(flight.order)}`,
  );
}

const fives = [
  makeCard(5, null, 1),
  makeCard(5, null, 2),
  makeCard(3, null, 3),
  makeCard(9, null, 4),
];

describe("planMove", () => {
  it("turns a drawn card face up in flight only for the player who draws it", () => {
    const draw: Move = { type: "drawFromDeck", playerId: self };
    const movePlan = plan(playingGame(), draw);
    expect(routes(movePlan)).toEqual(["drawPile -> held @0"]);
    expect(movePlan.flights[0]).toMatchObject({
      faceUpAtStart: false,
      faceUpAtEnd: true,
    });
    expect(movePlan.flights[0]?.card).toEqual(playingGame().drawPile[0]);
    expect(plan(playingGame(), draw, "player-2").flights[0]?.faceUpAtEnd).toBe(
      false,
    );
  });

  it("flies a discarded card face up onto the discard pile", () => {
    const card = makeCard(4);
    const previous = holding(playingGame(), card);
    const movePlan = plan(previous, {
      type: "discardDrawnCard",
      playerId: self,
    });
    expect(routes(movePlan)).toEqual(["held -> discardPile @0"]);
    expect(movePlan.flights[0]).toMatchObject({
      card,
      faceUpAtStart: true,
      faceUpAtEnd: true,
    });
    expect(movePlan.discardTopWhileFlying).toEqual(previous.discardPile[0]);
    const seenByOthers = plan(
      previous,
      { type: "discardDrawnCard", playerId: self },
      "player-2",
    );
    expect(seenByOthers.flights[0]).toMatchObject({
      faceUpAtStart: false,
      faceUpAtEnd: true,
    });
  });

  it("swaps several matching cards: the new card goes in, the old ones fly to the discard", () => {
    const previous = holding(withLayouts(playingGame(), [fives]), makeCard(2));
    const move: Move = {
      type: "swapDrawnCard",
      playerId: self,
      slotIndices: [1, 0],
    };
    expect(routes(plan(previous, move))).toEqual([
      "held -> slot:player-1:0 @0",
      "slot:player-1:1 -> discardPile @1",
      "slot:player-1:0 -> discardPile @2",
    ]);
  });

  it("turns a swapped-in card face down, and the swapped-out card face up", () => {
    const previous = holding(withLayouts(playingGame(), [fives]), makeCard(2));
    const move: Move = {
      type: "swapDrawnCard",
      playerId: self,
      slotIndices: [3],
    };
    const [incoming, outgoing] = plan(previous, move, self).flights;
    expect(incoming).toMatchObject({ faceUpAtStart: true, faceUpAtEnd: false });
    expect(outgoing).toMatchObject({ faceUpAtStart: false, faceUpAtEnd: true });
    expect(plan(previous, move, "player-2").flights[0]?.faceUpAtStart).toBe(
      false,
    );
  });

  it("only discards the drawn card when a multi-swap fails", () => {
    const previous = holding(withLayouts(playingGame(), [fives]), makeCard(2));
    const move: Move = {
      type: "swapDrawnCard",
      playerId: self,
      slotIndices: [0, 2],
    };
    expect(routes(plan(previous, move))).toEqual(["held -> discardPile @0"]);
  });

  it("takes the discard into the lowest slot and keeps the card below visible meanwhile", () => {
    const previous = withLayouts(playingGame(), [fives]);
    const move: Move = {
      type: "swapDiscardCard",
      playerId: self,
      slotIndices: [3],
    };
    const movePlan = plan(previous, move);
    expect(routes(movePlan)).toEqual([
      "discardPile -> slot:player-1:3 @0",
      "slot:player-1:3 -> discardPile @1",
    ]);
    expect(movePlan.discardTopWhileFlying).toBeNull();
  });

  it("lifts the card that was looked at for everyone", () => {
    const previous = holding(playingGame(3), makeCard(9, "viewOther"));
    const move: Move = {
      type: "viewOtherCard",
      playerId: self,
      targetPlayerId: "player-3",
      slotIndex: 2,
    };
    expect(plan(previous, move, "player-2").peekedSlot).toEqual({
      playerId: "player-3",
      slotIndex: 2,
    });
  });

  it("crosses two face-down cards for a blind exchange", () => {
    const previous = holding(playingGame(), makeCard(11, "exchangeBlind"));
    const move: Move = {
      type: "exchangeBlind",
      playerId: self,
      ownSlotIndex: 0,
      targetPlayerId: "player-2",
      targetSlotIndex: 3,
    };
    const movePlan = plan(previous, move);
    expect(routes(movePlan)).toEqual([
      "held -> discardPile @0",
      "slot:player-1:0 -> slot:player-2:3 @1",
      "slot:player-2:3 -> slot:player-1:0 @1",
    ]);
    expect(
      movePlan.flights
        .slice(1)
        .every((flight) => !flight.faceUpAtStart && !flight.faceUpAtEnd),
    ).toBe(true);
  });

  it("deals four rounds face down and then turns over the first discard", () => {
    const dealt = playingGame(3);
    const movePlan = planDeal(dealt);
    const dealtRoutes = routes(movePlan);
    expect(dealtRoutes).toHaveLength(13);
    expect(dealtRoutes.slice(0, 4)).toEqual([
      "drawPile -> slot:player-1:0 @0",
      "drawPile -> slot:player-2:0 @1",
      "drawPile -> slot:player-3:0 @2",
      "drawPile -> slot:player-1:1 @3",
    ]);
    expect(dealtRoutes.at(-1)).toBe("drawPile -> discardPile @12");
    expect(movePlan.flights.at(-1)).toMatchObject({
      card: dealt.discardPile[0],
      faceUpAtStart: false,
      faceUpAtEnd: true,
    });
    expect(movePlan.discardTopWhileFlying).toBeNull();
  });

  it("does not animate calling the end", () => {
    expect(
      plan(playingGame(), { type: "callEnd", playerId: self }).flights,
    ).toEqual([]);
  });
});
