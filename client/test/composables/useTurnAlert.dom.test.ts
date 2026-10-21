import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, nextTick, ref } from "vue";

import { useTurnAlert } from "@/composables/useTurnAlert";
import { strings } from "@/data/strings";

const playTurnSound = vi.hoisted(() => vi.fn());
vi.mock("@/utils/turnSound", () => ({ playTurnSound }));

function setup() {
  const myTurn = ref(false);
  const wrapper = mount(
    defineComponent({
      setup() {
        useTurnAlert(() => myTurn.value);
        return () => null;
      },
    }),
  );
  return { myTurn, wrapper };
}

function setFocus(focused: boolean) {
  vi.spyOn(document, "hasFocus").mockReturnValue(focused);
}

describe("useTurnAlert", () => {
  beforeEach(() => {
    document.title = "Handsum";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    playTurnSound.mockClear();
  });

  it("changes the title and plays a sound when the turn starts in the background", async () => {
    setFocus(false);
    const { myTurn } = setup();

    myTurn.value = true;
    await nextTick();

    expect(document.title).toBe(strings.turnAlert.title);
    expect(playTurnSound).toHaveBeenCalledOnce();
  });

  it("stays quiet while the player is looking at the game", async () => {
    setFocus(true);
    const { myTurn } = setup();

    myTurn.value = true;
    await nextTick();

    expect(document.title).toBe("Handsum");
    expect(playTurnSound).not.toHaveBeenCalled();
  });

  it("restores the title when the window gets focus or the turn ends", async () => {
    setFocus(false);
    const { myTurn } = setup();
    myTurn.value = true;
    await nextTick();

    window.dispatchEvent(new Event("focus"));
    expect(document.title).toBe("Handsum");

    document.title = strings.turnAlert.title;
    myTurn.value = false;
    await nextTick();
    expect(document.title).toBe("Handsum");
  });
});
