import { computed, type ComputedRef, onUnmounted, ref } from "vue";

import { normalizeRoomCode } from "@/net/roomCode";
import { TUTORIAL_HASH } from "@/utils/roomNavigation";

export type Route =
  | { readonly kind: "home" }
  | { readonly kind: "tutorial" }
  | { readonly kind: "room"; readonly roomCode: string };

export function parseRoute(hash: string): Route {
  if (hash.replace(/^#/, "") === TUTORIAL_HASH) {
    return { kind: "tutorial" };
  }
  const roomCode = normalizeRoomCode(hash);
  return roomCode ? { kind: "room", roomCode } : { kind: "home" };
}

export function useRoute(): ComputedRef<Route> {
  const hash = ref(location.hash);
  const updateFromHash = () => {
    hash.value = location.hash;
  };
  window.addEventListener("hashchange", updateFromHash);
  onUnmounted(() => {
    window.removeEventListener("hashchange", updateFromHash);
  });
  return computed(() => parseRoute(hash.value));
}
