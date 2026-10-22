import type { VueWrapper } from "@vue/test-utils";

export function buttonLabelled(wrapper: VueWrapper, label: string) {
  return wrapper.findAll("button").find((button) => button.text() === label);
}
