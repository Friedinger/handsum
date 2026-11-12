import { computed, type ComputedRef, onUnmounted, ref } from "vue";

import { normalizeRoomCode } from "@/net/roomCode";
import { DEV_ROOM_CODE, TUTORIAL_ROOM_CODE } from "@/utils/roomNavigation";

type Route =
  | { readonly kind: "home" }
  | { readonly kind: "tutorial" }
  | { readonly kind: "dev" }
  | { readonly kind: "room"; readonly roomCode: string };

export function parseRoute(hash: string): Route {
  const target = hash.replace(/^#/, "");
  if (target === TUTORIAL_ROOM_CODE) {
    return { kind: "tutorial" };
  }
  if (import.meta.env.DEV && target === DEV_ROOM_CODE) {
    return { kind: "dev" };
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
