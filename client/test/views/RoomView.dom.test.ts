import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import { strings } from "@/data/strings";
import RoomView from "@/views/RoomView.vue";

function mountRoom() {
  return mount(RoomView, { props: { roomCode: "ABCDEF" } });
}

describe("RoomView name form", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("refuses a name with characters that are not allowed", async () => {
    const wrapper = mountRoom();

    await wrapper.find("input").setValue("<b>Anna</b>");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.text()).toContain(strings.nameForm.invalid);
    expect(wrapper.find("form").exists()).toBe(true);
  });

  it("shows no error before a name is submitted", () => {
    expect(mountRoom().text()).not.toContain(strings.nameForm.invalid);
  });
});
