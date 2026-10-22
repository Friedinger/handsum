import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import CardFan from "@/components/CardFan.vue";
import { strings } from "@/data/strings";

describe("CardFan", () => {
  it("fans out four cards, one of each colour tier", () => {
    const wrapper = mount(CardFan);

    const cards = wrapper.findAll(".card");
    expect(cards.map((card) => card.find(".card-value").text())).toEqual([
      "0",
      "5",
      "9",
      "13",
    ]);
    expect(cards.map((card) => card.classes())).toEqual([
      expect.arrayContaining(["tier-low"]),
      expect.arrayContaining(["tier-middle"]),
      expect.arrayContaining(["tier-action"]),
      expect.arrayContaining(["tier-plain-high"]),
    ]);
  });

  it("labels the action card with its action from the card data", () => {
    const wrapper = mount(CardFan);

    expect(wrapper.text()).toContain(strings.cardActionNames.viewOther);
  });
});
