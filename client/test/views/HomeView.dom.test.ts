import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import HomeView from "@/views/HomeView.vue";

describe("HomeView", () => {
  afterEach(() => {
    history.replaceState(null, "", "/");
  });

  it("creates a room with a fresh room code", async () => {
    const wrapper = mount(HomeView);

    await wrapper.find("button.button-primary").trigger("click");

    expect(location.hash).toMatch(/^#[A-Z2-9]{6}$/);
  });

  it("joins an existing room, ignoring case and spaces", async () => {
    const wrapper = mount(HomeView);

    await wrapper.find("input").setValue("  abcdef ");
    await wrapper.find("form").trigger("submit");

    expect(location.hash).toBe("#ABCDEF");
    expect(wrapper.text()).not.toContain(strings.home.invalidRoomCode);
  });

  it("explains an invalid room code and stays on the page", async () => {
    const wrapper = mount(HomeView);

    await wrapper.find("input").setValue("nope");
    await wrapper.find("form").trigger("submit");

    expect(location.hash).toBe("");
    expect(wrapper.text()).toContain(strings.home.invalidRoomCode);
  });
});
