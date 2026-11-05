import { describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import { noIntent, situationOf } from "@/utils/tableIntent";
import {
  centerView,
  handView,
  seatView,
  slotViews,
  type TableViewContext,
} from "@/utils/tableView";

import { makeCard, startedGame, withLayouts } from "@test/support/gameFixtures";

describe("slotViews", () => {
  const lowCard = makeCard(2, null, 1);
  const highCard = makeCard(9, null, 2);

  function setup(overrides: Partial<TableViewContext> = {}) {
    const base = startedGame(2);
    const state = withLayouts(base, [[lowCard, null, highCard]]);
    const [seat] = state.seats;
    if (!seat) {
      throw new Error("Expected a seat");
    }
    const context: TableViewContext = {
      state,
      selfId: seat.player.id,
      intent: noIntent,
      situation: situationOf(state, seat.player.id),
      reveals: [],
      onlineIds: new Set(state.seats.map((each) => each.player.id)),
      isClickable: () => false,
      isHighlighted: () => false,
      hasGivenHighlight: false,
      hiddenAnchors: new Set(),
      peekedAnchor: null,
      discardTopWhileFlying: undefined,
      ...overrides,
    };
    return { seat, context };
  }

  it("skips empty slots but keeps the slot index of the others", () => {
    const { seat, context } = setup();

    expect(slotViews(seat, context).map((view) => view.slotIndex)).toEqual([
      0, 2,
    ]);
  });

  it("shows cards face down unless they are revealed or the game is over", () => {
    const { seat, context } = setup();
    const revealed = slotViews(seat, {
      ...context,
      reveals: [
        {
          reason: "viewed",
          ownerId: seat.player.id,
          slotIndex: 2,
          card: highCard,
          durationMs: 1000,
        },
      ],
    });

    expect(slotViews(seat, context).map((view) => view.faceUp)).toEqual([
      false,
      false,
    ]);
    expect(revealed.map((view) => view.faceUp)).toEqual([false, true]);
    const finished: TableViewContext = {
      ...context,
      state: { ...context.state, phase: { kind: "finished", results: [] } },
    };
    expect(slotViews(seat, finished).map((view) => view.faceUp)).toEqual([
      true,
      true,
    ]);
  });

  it("marks the slots that are flying or peeked by their anchor", () => {
    const { seat, context } = setup();
    const [first, second] = slotViews(seat, context).map((view) => view.anchor);
    const views = slotViews(seat, {
      ...context,
      hiddenAnchors: new Set([first ?? ""]),
      peekedAnchor: second ?? null,
    });

    expect(views.map((view) => [view.inFlight, view.peeked])).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it("asks the context which slots are clickable and highlighted", () => {
    const { seat, context } = setup({
      isClickable: (target) =>
        target.kind === "slot" && target.slot.slotIndex === 0,
      isHighlighted: (target) =>
        target.kind === "slot" && target.slot.slotIndex === 2,
    });

    expect(
      slotViews(seat, context).map((view) => [
        view.clickable,
        view.highlighted,
      ]),
    ).toEqual([
      [true, false],
      [false, true],
    ]);
  });

  it("names the own seat and marks offline players and the end caller", () => {
    const { seat, context } = setup();
    const view = seatView(seat, {
      ...context,
      onlineIds: new Set(),
      state: { ...context.state, endCallerId: seat.player.id },
    });

    expect(view.name).toBe(`${seat.player.name} (${strings.table.you})`);
    expect(view.badges).toEqual([
      strings.table.offline,
      strings.table.calledEnd,
    ]);
  });

  it("shows the top of the discard pile unless a flight overrides it", () => {
    const { context } = setup();
    const flying = makeCard(7, null, 3);

    expect(centerView(context).discardTop).toEqual(
      context.state.discardPile[0] ?? null,
    );
    expect(
      centerView({ ...context, discardTopWhileFlying: flying }).discardTop,
    ).toEqual(flying);
  });

  it("prefers a rejection over the reminder and the reminder over the hint", () => {
    const { seat, context } = setup();
    const reminding: TableViewContext = {
      ...context,
      reveals: [
        {
          reason: "startingView",
          ownerId: seat.player.id,
          slotIndex: 0,
          card: lowCard,
          durationMs: 1000,
        },
      ],
    };

    expect(handView(reminding, "invalidPlayerId").message).toBe(
      strings.rejectionMessages.invalidPlayerId,
    );
    expect(handView(reminding, null).message).toBe(strings.hints.rememberCards);
    expect(handView(context, null).message).not.toBe(
      strings.hints.rememberCards,
    );
  });

  it("does not offer to call the end during the starting view", () => {
    const { context } = setup();

    expect(handView(context, null).canCallEnd).toBe(false);
  });
});
