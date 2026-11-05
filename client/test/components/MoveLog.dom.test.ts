import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import MoveLog from "@/components/MoveLog.vue";

describe("MoveLog", () => {
  it("lists the descriptions in order", () => {
    const wrapper = mount(MoveLog, {
      props: { descriptions: ["Robin drew a card", "Robin discarded a 5"] },
    });

    expect(wrapper.findAll("li").map((item) => item.text())).toEqual([
      "Robin drew a card",
      "Robin discarded a 5",
    ]);
  });
});
