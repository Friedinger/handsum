import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useConfirmation } from "@/composables/useConfirmation";

import { mountComposable } from "@test/support/mountComposable";

const TIMEOUT_MS = 3000;

describe("useConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const action = vi.fn();
    const { result } = mountComposable(() => useConfirmation(TIMEOUT_MS));
    return { ...result, action };
  }

  it("only arms on the first request", () => {
    const { armed, request, action } = setup();

    request(action);

    expect(armed.value).toBe(true);
    expect(action).not.toHaveBeenCalled();
  });

  it("runs the action on the second request", () => {
    const { armed, request, action } = setup();

    request(action);
    request(action);

    expect(action).toHaveBeenCalledOnce();
    expect(armed.value).toBe(false);
  });

  it("disarms after the timeout, so a late click arms again", () => {
    const { armed, request, action } = setup();
    request(action);

    vi.advanceTimersByTime(TIMEOUT_MS);
    expect(armed.value).toBe(false);

    request(action);
    expect(action).not.toHaveBeenCalled();
  });
});
