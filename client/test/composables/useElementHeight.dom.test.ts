import { afterEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { useElementHeight } from "@/composables/useElementHeight";

import { mountComposable } from "@test/support/mountComposable";

type ResizeCallback = (
  entries: { borderBoxSize: { blockSize: number }[] }[],
) => void;

class FakeResizeObserver {
  static latest: FakeResizeObserver | null = null;
  readonly observed = new Set<Element>();
  disconnected = false;
  private readonly callback: ResizeCallback;

  constructor(callback: ResizeCallback) {
    this.callback = callback;
    FakeResizeObserver.latest = this;
  }

  observe(element: Element): void {
    this.observed.add(element);
  }

  unobserve(element: Element): void {
    this.observed.delete(element);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  resize(blockSize: number): void {
    this.callback([{ borderBoxSize: [{ blockSize }] }]);
  }
}

function latestObserver(): FakeResizeObserver {
  if (!FakeResizeObserver.latest) {
    throw new Error("No observer was created");
  }
  return FakeResizeObserver.latest;
}

describe("useElementHeight", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows the height of the observed element", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const element = ref<HTMLElement | null>(null);
    const { result: height } = mountComposable(() => useElementHeight(element));
    const first = document.createElement("div");

    element.value = first;
    await nextTick();
    latestObserver().resize(120);

    expect(latestObserver().observed.has(first)).toBe(true);
    expect(height.value).toBe(120);
  });

  it("observes only the current element and stops when unmounted", async () => {
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const first = document.createElement("div");
    const second = document.createElement("div");
    const element = ref<HTMLElement | null>(first);
    const { unmount } = mountComposable(() => useElementHeight(element));

    element.value = second;
    await nextTick();
    unmount();

    expect([...latestObserver().observed]).toEqual([second]);
    expect(latestObserver().disconnected).toBe(true);
  });

  it("stays at zero where sizes cannot be observed", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const element = ref(document.createElement("div"));

    const { result: height } = mountComposable(() => useElementHeight(element));

    expect(height.value).toBe(0);
  });
});
