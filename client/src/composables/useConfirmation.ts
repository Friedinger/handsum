import { onUnmounted, ref } from "vue";

/**
 * Guards a click that cannot be undone: the first click only arms the button for a moment,
 * the second one inside that time runs the action.
 */
export function useConfirmation(timeoutMs: number) {
  const armed = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  const disarm = () => {
    clearTimeout(timer);
    armed.value = false;
  };

  const request = (action: () => void) => {
    if (armed.value) {
      disarm();
      action();
      return;
    }
    armed.value = true;
    timer = setTimeout(disarm, timeoutMs);
  };

  onUnmounted(disarm);

  return { armed, request };
}
