import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { devModeStrings } from "@/data/strings";
import DevView from "@/views/DevView.vue";

import { buttonLabelled } from "@test/support/domQueries";

const texts = devModeStrings();

function nameInputs(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll("input");
}

describe("DevView", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("prefills a name for every seat of the default player count", () => {
    const wrapper = mount(DevView);

    expect(nameInputs(wrapper).map((input) => input.element.value)).toEqual(
      texts.defaultNames.slice(0, 4),
    );
  });

  it("shows one name per seat and remembers the settings", async () => {
    const wrapper = mount(DevView);

    await buttonLabelled(wrapper, "6")?.trigger("click");
    await buttonLabelled(wrapper, texts.speeds.instant)?.trigger("click");
    const remounted = mount(DevView);

    expect(nameInputs(wrapper)).toHaveLength(6);
    expect(nameInputs(remounted)).toHaveLength(6);
    expect(
      buttonLabelled(remounted, texts.speeds.instant)?.attributes(
        "aria-pressed",
      ),
    ).toBe("true");
  });

  it("refuses to start with an invalid name", async () => {
    const wrapper = mount(DevView);

    await nameInputs(wrapper)[1]?.setValue("   ");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.text()).toContain(texts.invalidNames);
    expect(wrapper.find(".game-table").exists()).toBe(false);
  });

  it("starts the game and returns to the settings", async () => {
    const wrapper = mount(DevView);

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".game-table").exists()).toBe(true);
    await buttonLabelled(wrapper, texts.settings)?.trigger("click");
    expect(wrapper.find("form").exists()).toBe(true);
    wrapper.unmount();
  });
});
