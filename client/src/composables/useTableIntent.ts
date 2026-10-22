import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import type { Move, PlayerId, StartedGame } from "@/engine";
import {
  type ClickTarget,
  type Intent,
  noIntent,
  selectedOwnSlots,
  type Situation,
  situationOf,
} from "@/utils/tableIntent";
import { handleClick, isClickable } from "@/utils/tableInteraction";

const CANCELLABLE_SITUATIONS: readonly Situation["kind"][] = [
  "choosing",
  "holding",
];

interface TableIntentOptions {
  readonly state: () => StartedGame;
  readonly selfId: () => PlayerId;
  readonly onMove: (move: Move) => void;
}

export function useTableIntent({ state, selfId, onMove }: TableIntentOptions) {
  const intent = ref<Intent>(noIntent);
  const situation = computed(() => situationOf(state(), selfId()));

  /**
   * Only a change of the own situation drops a half-made selection, not moves by others.
   */
  const intentContext = computed(() =>
    situation.value.kind === "startingView"
      ? situation.value.kind
      : `${situation.value.kind}:${String(state().moveCount)}`,
  );
  watch(intentContext, () => {
    intent.value = noIntent;
  });

  const hasSelection = computed(
    () => selectedOwnSlots(intent.value).length > 0,
  );
  const isTakingDiscard = computed(() => intent.value.kind === "takingDiscard");
  const targetsOpponents = computed(
    () => intent.value.kind === "action" && intent.value.action !== "viewOwn",
  );

  function clickable(target: ClickTarget): boolean {
    return isClickable(state(), selfId(), intent.value, target);
  }

  function click(target: ClickTarget): void {
    const outcome = handleClick(state(), selfId(), intent.value, target);
    intent.value = outcome.intent;
    if (outcome.move) {
      onMove(outcome.move);
    }
  }

  function cancel(): void {
    if (CANCELLABLE_SITUATIONS.includes(situation.value.kind)) {
      intent.value = noIntent;
    }
  }

  function cancelOnEscape(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      cancel();
    }
  }

  function cancelOnEmptyClick(event: MouseEvent): void {
    if (event.target instanceof Element && !event.target.closest("button")) {
      cancel();
    }
  }

  onMounted(() => {
    document.addEventListener("keydown", cancelOnEscape);
  });
  onUnmounted(() => {
    document.removeEventListener("keydown", cancelOnEscape);
  });

  return {
    intent,
    situation,
    hasSelection,
    isTakingDiscard,
    targetsOpponents,
    clickable,
    click,
    cancelOnEmptyClick,
  };
}
