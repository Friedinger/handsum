import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LastRoundBanner from "@/components/LastRoundBanner.vue";

describe("LastRoundBanner", () => {
  it("shows the text while visible", () => {
    const wrapper = mount(LastRoundBanner, {
      props: { text: "Last round", visible: true },
    });

    expect(wrapper.text()).toBe("Last round");
    expect(wrapper.classes()).not.toContain("banner-hidden");
  });

  it("keeps its place in the layout while hidden", () => {
    const wrapper = mount(LastRoundBanner, {
      props: { text: "", visible: false },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.classes()).toContain("banner-hidden");
  });
});
