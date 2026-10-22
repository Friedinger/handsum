import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TutorialCoach from "@/components/TutorialCoach.vue";

describe("TutorialCoach", () => {
  it("shows the title and the text", () => {
    const wrapper = mount(TutorialCoach, {
      props: { title: "Draw a card", text: "Click the pile.", notice: null },
    });

    expect(wrapper.text()).toContain("Draw a card");
    expect(wrapper.text()).toContain("Click the pile.");
  });

  it("shows a notice only when there is one", () => {
    const props = { title: "Title", text: "Text" };

    const quiet = mount(TutorialCoach, { props: { ...props, notice: null } });
    const warned = mount(TutorialCoach, {
      props: { ...props, notice: "Not that one." },
    });

    expect(quiet.text()).not.toContain("Not that one.");
    expect(warned.text()).toContain("Not that one.");
  });
});
