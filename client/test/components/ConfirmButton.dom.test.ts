import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ConfirmButton from "@/components/ConfirmButton.vue";

const props = { label: "Leave", confirmLabel: "Really leave?" };

describe("ConfirmButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for confirmation on the first click", async () => {
    const wrapper = mount(ConfirmButton, { props });

    await wrapper.trigger("click");

    expect(wrapper.text()).toBe("Really leave?");
    expect(wrapper.classes()).toContain("button-confirming");
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });

  it("confirms on the second click and shows the label again", async () => {
    const wrapper = mount(ConfirmButton, { props });

    await wrapper.trigger("click");
    await wrapper.trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
    expect(wrapper.text()).toBe("Leave");
  });

  it("confirms at once when no confirmation is needed", async () => {
    const wrapper = mount(ConfirmButton, {
      props: { ...props, needsConfirmation: false },
    });

    await wrapper.trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });
});
