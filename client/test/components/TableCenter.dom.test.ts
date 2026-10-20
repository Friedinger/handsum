import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TableCenter from "@/components/TableCenter.vue";
import { strings } from "@/data/strings";

import { makeCard } from "@test/support/gameFixtures";

const baseProps = {
  drawPileCount: 12,
  discardTop: makeCard(4),
  heldCard: null,
  heldLabel: null,
  heldFaceUp: false,
  drawClickable: true,
  discardClickable: true,
  heldClickable: false,
  heldMarked: false,
  heldInFlight: false,
  heldIsTakenDiscard: false,
};

describe("TableCenter", () => {
  it("counts the cards left to draw", () => {
    const wrapper = mount(TableCenter, { props: baseProps });

    expect(wrapper.text()).toContain(strings.table.drawPileCount(12));
  });

  it("names the draw pile for screen readers", () => {
    const wrapper = mount(TableCenter, { props: baseProps });

    expect(wrapper.find(".pile-stack").attributes("aria-label")).toBe(
      strings.table.drawPile,
    );
  });

  it("reports clicks on the piles", async () => {
    const wrapper = mount(TableCenter, { props: baseProps });
    const [drawPile, discardPile] = wrapper.findAll("button");

    await drawPile?.trigger("click");
    await discardPile?.trigger("click");

    expect(wrapper.emitted("draw")).toHaveLength(1);
    expect(wrapper.emitted("discard")).toHaveLength(1);
  });

  it("keeps the place for a held card free until someone draws", () => {
    const wrapper = mount(TableCenter, { props: baseProps });

    expect(wrapper.find(".pile-held").classes()).toContain("pile-vacant");
  });

  it("shows the held card with its label and reports a click on it", async () => {
    const wrapper = mount(TableCenter, {
      props: {
        ...baseProps,
        heldCard: makeCard(7, "viewOwn"),
        heldLabel: strings.table.yourCard,
        heldFaceUp: true,
        heldClickable: true,
      },
    });

    await wrapper.find(".pile-held button").trigger("click");

    expect(wrapper.find(".pile-held").text()).toContain(strings.table.yourCard);
    expect(wrapper.find(".pile-held").classes()).not.toContain("pile-vacant");
    expect(wrapper.emitted("held")).toHaveLength(1);
  });
});
