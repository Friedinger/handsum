import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TableHand from "@/components/TableHand.vue";
import { strings } from "@/data/strings";
import type { SeatView } from "@/utils/tableView";

import { makeCard } from "@test/support/gameFixtures";

const seat: SeatView = {
  name: "Robin",
  badges: [],
  slots: [
    {
      slotIndex: 0,
      card: makeCard(4),
      faceUp: false,
      clickable: true,
      marked: false,
      highlighted: false,
      anchor: "slot:robin:0",
      inFlight: false,
      peeked: false,
    },
  ],
  active: true,
};

const baseProps = {
  seat,
  message: "Draw a card",
  showMessage: true,
  messageActive: true,
  messageIsError: false,
  canCallEnd: false,
  callEndHighlighted: false,
  finished: false,
};

describe("TableHand", () => {
  it("shows the message above the own cards", () => {
    const wrapper = mount(TableHand, { props: baseProps });

    expect(wrapper.find(".hint").text()).toBe("Draw a card");
    expect(wrapper.find(".hint").classes()).toContain("hint-active");
    expect(wrapper.text()).toContain("Robin");
  });

  it("leaves the message out when asked to", () => {
    const wrapper = mount(TableHand, {
      props: { ...baseProps, showMessage: false },
    });

    expect(wrapper.find(".hint").exists()).toBe(false);
  });

  it("leaves the message and the actions to the results once finished", () => {
    const wrapper = mount(TableHand, {
      props: { ...baseProps, canCallEnd: true, finished: true },
    });

    expect(wrapper.find(".hint").exists()).toBe(false);
    expect(wrapper.find(".hand-actions").exists()).toBe(false);
    expect(wrapper.text()).toContain("Robin");
  });

  it("passes a click on an own card on as its slot index", async () => {
    const wrapper = mount(TableHand, { props: baseProps });

    await wrapper.find(".player-seat button").trigger("click");

    expect(wrapper.emitted("select")).toEqual([[0]]);
  });

  it("offers to call the end only when allowed", async () => {
    const hidden = mount(TableHand, { props: baseProps });
    const shown = mount(TableHand, {
      props: { ...baseProps, canCallEnd: true },
    });

    expect(hidden.find(".button-call").exists()).toBe(false);
    const button = shown.find(".button-call");
    expect(button.text()).toBe(strings.table.callEnd);
    await button.trigger("click");
    await button.trigger("click");
    expect(shown.emitted("callEnd")).toHaveLength(1);
  });
});
