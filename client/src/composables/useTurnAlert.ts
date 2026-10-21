import { onUnmounted, watch } from "vue";

import { strings } from "@/data/strings";
import { playTurnSound } from "@/utils/turnSound";

function isInBackground(): boolean {
  return document.visibilityState !== "visible" || !document.hasFocus();
}

/**
 * Games are played in a shared link, so players often wait in another tab or window.
 */
export function useTurnAlert(isMyTurn: () => boolean): void {
  const originalTitle = document.title;

  const restoreTitle = () => {
    document.title = originalTitle;
  };

  watch(isMyTurn, (myTurn) => {
    if (!myTurn) {
      restoreTitle();
      return;
    }
    if (isInBackground()) {
      document.title = strings.turnAlert.title;
      playTurnSound();
    }
  });

  window.addEventListener("focus", restoreTitle);
  document.addEventListener("visibilitychange", restoreTitle);
  onUnmounted(() => {
    window.removeEventListener("focus", restoreTitle);
    document.removeEventListener("visibilitychange", restoreTitle);
    restoreTitle();
  });
}
