import { mount } from "@vue/test-utils";
import { defineComponent } from "vue";

export interface MountedComposable<T> {
  readonly result: T;
  readonly unmount: () => void;
}

export function mountComposable<T>(setup: () => T): MountedComposable<T> {
  let result: T | undefined;
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup();
        return () => null;
      },
    }),
  );
  if (result === undefined) {
    throw new Error("The composable returned nothing");
  }
  return {
    result,
    unmount: () => {
      wrapper.unmount();
    },
  };
}
