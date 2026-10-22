import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import PlayerSeat from "@/components/PlayerSeat.vue";
import type { SlotView } from "@/utils/slotView";

import { makeCard } from "@test/support/gameFixtures";

function slot(slotIndex: number, overrides: Partial<SlotView> = {}): SlotView {
  return {
    slotIndex,
    card: makeCard(slotIndex + 1),
    faceUp: false,
    clickable: true,
    marked: false,
    highlighted: false,
    anchor: `slot:p:${String(slotIndex)}`,
    inFlight: false,
    peeked: false,
    ...overrides,
  };
}

describe("PlayerSeat", () => {
  it("shows the name and the badges", () => {
    const wrapper = mount(PlayerSeat, {
      props: {
        name: "Anna",
        badges: ["offline"],
        slots: [],
        active: false,
        size: "small",
      },
    });

    expect(wrapper.find(".seat-name").text()).toBe("Anna");
    expect(wrapper.findAll(".seat-badge").map((badge) => badge.text())).toEqual(
      ["offline"],
    );
  });

  it("highlights the active seat", () => {
    const wrapper = mount(PlayerSeat, {
      props: {
        name: "Anna",
        badges: [],
        slots: [],
        active: true,
        size: "large",
      },
    });

    expect(wrapper.classes()).toContain("seat-active");
    expect(wrapper.classes()).toContain("seat-large");
  });

  it("reports which slot was selected", async () => {
    const wrapper = mount(PlayerSeat, {
      props: {
        name: "Anna",
        badges: [],
        slots: [slot(0), slot(2)],
        active: false,
        size: "large",
      },
    });

    await wrapper.findAll(".card")[1]?.trigger("click");

    expect(wrapper.emitted("select")).toEqual([[2]]);
  });

  it("anchors every card for the flight animations", () => {
    const wrapper = mount(PlayerSeat, {
      props: {
        name: "Anna",
        badges: [],
        slots: [slot(0)],
        active: false,
        size: "large",
      },
    });

    expect(wrapper.find(".card").attributes("data-anchor")).toBe("slot:p:0");
  });

  it("pulses the highlighted cards only", () => {
    const wrapper = mount(PlayerSeat, {
      props: {
        name: "Anna",
        badges: [],
        slots: [slot(0, { highlighted: true }), slot(1)],
        active: false,
        size: "large",
      },
    });
    const [first, second] = wrapper.findAll(".card");

    expect(first?.classes()).toContain("card-ready");
    expect(second?.classes()).not.toContain("card-ready");
  });
});
