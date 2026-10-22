import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OPPONENT_MOVE_DELAY_MS } from "@/composables/useTutorial";
import { strings } from "@/data/strings";
import TutorialView from "@/views/TutorialView.vue";

const { tutorial } = strings;

function buttonLabelled(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll("button").find((button) => button.text() === label);
}

describe("TutorialView", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    history.replaceState(null, "", "/");
  });

  it("explains the goal before any card is dealt", () => {
    const wrapper = mount(TutorialView);

    expect(wrapper.text()).toContain(tutorial.intro.title);
    expect(wrapper.find(".game-table").exists()).toBe(false);
  });

  it("deals the cards and coaches the first step after starting", async () => {
    const wrapper = mount(TutorialView);

    await buttonLabelled(wrapper, tutorial.start)?.trigger("click");
    await vi.advanceTimersByTimeAsync(0);

    expect(wrapper.find(".game-table .table-coach").exists()).toBe(true);
    expect(wrapper.text()).toContain(tutorial.steps.lookAtCards.title);
    expect(buttonLabelled(wrapper, tutorial.start)).toBeUndefined();
  });

  it("moves on to the next lesson after the starting view", async () => {
    const wrapper = mount(TutorialView);
    await buttonLabelled(wrapper, tutorial.start)?.trigger("click");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(OPPONENT_MOVE_DELAY_MS);

    const ownCards = wrapper.findAll(".seat-large .card");
    await ownCards[0]?.trigger("click");
    await ownCards[1]?.trigger("click");
    await vi.advanceTimersByTimeAsync(0);

    expect(wrapper.text()).toContain(tutorial.steps.draw.title);
  });

  it("can be skipped before the deal and returns to the home page", async () => {
    location.hash = "tutorial";
    const wrapper = mount(TutorialView);

    await buttonLabelled(wrapper, tutorial.skip)?.trigger("click");

    expect(location.hash).toBe("");
  });
});
