import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PlayingCard from "@/components/PlayingCard.vue";
import { strings } from "@/data/strings";
import { makeCard } from "@test/support/gameFixtures";

describe("PlayingCard", () => {
  it("shows value and action of a face-up card", () => {
    const wrapper = mount(PlayingCard, {
      props: { card: makeCard(9, "viewOther"), faceUp: true },
    });

    expect(wrapper.text()).toContain("9");
    expect(wrapper.text()).toContain(strings.cardActionNames.viewOther);
    expect(wrapper.classes()).toContain("tier-action");
  });

  it("hides a face-down card and names it for screen readers", () => {
    const wrapper = mount(PlayingCard, {
      props: { card: makeCard(9), faceUp: false },
    });

    expect(wrapper.text()).toBe("");
    expect(wrapper.classes()).toContain("card-back");
    expect(wrapper.attributes("aria-label")).toBe(strings.table.hiddenCard);
  });

  it("does not label a face-up card, its text is readable", () => {
    const wrapper = mount(PlayingCard, {
      props: { card: makeCard(2), faceUp: true },
    });

    expect(wrapper.attributes("aria-label")).toBeUndefined();
  });

  it("is a button that reports clicks only when clickable", async () => {
    const clickable = mount(PlayingCard, {
      props: { card: null, faceUp: false, clickable: true },
    });
    const plain = mount(PlayingCard, { props: { card: null, faceUp: false } });

    await clickable.trigger("click");
    await plain.trigger("click");

    expect(clickable.element.tagName).toBe("BUTTON");
    expect(clickable.emitted("click")).toHaveLength(1);
    expect(plain.element.tagName).toBe("DIV");
    expect(plain.emitted("click")).toBeUndefined();
  });

  it("shows an empty placeholder for a face-up pile without a card", () => {
    const wrapper = mount(PlayingCard, { props: { card: null, faceUp: true } });

    expect(wrapper.classes()).toContain("card-placeholder");
  });
});
