import { onUnmounted, shallowRef, watch, type ShallowRef } from "vue";
import type { PlayerId } from "@/engine";
import type { SyncedLog } from "@/net/moveLog";
import { revealsAfterMove, type Reveal } from "@/ui/reveals";

export function useReveals(
  log: () => SyncedLog,
  selfId: PlayerId,
): ShallowRef<readonly Reveal[]> {
  const reveals = shallowRef<readonly Reveal[]>([]);
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const show = (reveal: Reveal) => {
    reveals.value = [...reveals.value, reveal];
    const timer = setTimeout(() => {
      reveals.value = reveals.value.filter((existing) => existing !== reveal);
      timers.delete(timer);
    }, reveal.durationMs);
    timers.add(timer);
  };

  watch(
    () => log().moves.length,
    (length, previousLength) => {
      const { state, moves } = log();
      const lastMove = moves.at(-1);
      if (length <= previousLength || state.status !== "started" || !lastMove) {
        return;
      }
      revealsAfterMove(state, lastMove, selfId).forEach(show);
    },
  );

  onUnmounted(() => {
    timers.forEach(clearTimeout);
  });

  return reveals;
}
