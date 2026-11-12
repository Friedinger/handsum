import { onUnmounted, readonly, type Ref, ref, watch } from "vue";

/** Stays 0 where the browser cannot observe sizes, which leaves layouts at their fallback. */
export function useElementHeight(element: Ref<HTMLElement | null>) {
  const height = ref(0);
  if (typeof ResizeObserver === "undefined") {
    return readonly(height);
  }
  const observer = new ResizeObserver(([entry]) => {
    height.value = entry?.borderBoxSize[0]?.blockSize ?? 0;
  });
  watch(
    element,
    (current, previous) => {
      if (previous) {
        observer.unobserve(previous);
      }
      if (current) {
        observer.observe(current);
      }
    },
    { immediate: true },
  );
  onUnmounted(() => {
    observer.disconnect();
  });
  return readonly(height);
}
