import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { devModeStrings } from "@/data/strings";
import { HEADER_ACTIONS_ID } from "@/utils/headerActions";
import DevView from "@/views/DevView.vue";

import { buttonLabelled } from "@test/support/domQueries";

const texts = devModeStrings();

function nameInputs(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll("input");
}

function headerButton(label: string): HTMLButtonElement | undefined {
  return [
    ...document.querySelectorAll<HTMLButtonElement>(
      `#${HEADER_ACTIONS_ID} button`,
    ),
  ].find((button) => button.textContent.trim() === label);
}

describe("DevView", () => {
  beforeEach(() => {
    localStorage.clear();
    const headerActions = document.createElement("div");
    headerActions.id = HEADER_ACTIONS_ID;
    document.body.append(headerActions);
  });

  afterEach(() => {
    localStorage.clear();
    document.body.replaceChildren();
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

  it("starts the game with its actions in the header", async () => {
    const wrapper = mount(DevView);

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(wrapper.find(".game-table").exists()).toBe(true);
    expect(headerButton(texts.endRound)).toBeDefined();
    wrapper.unmount();
  });

  it("returns to the settings and clears the header", async () => {
    const wrapper = mount(DevView);
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    headerButton(texts.settings)?.click();
    await flushPromises();

    expect(wrapper.find("form").exists()).toBe(true);
    expect(headerButton(texts.settings)).toBeUndefined();
    wrapper.unmount();
  });
});
