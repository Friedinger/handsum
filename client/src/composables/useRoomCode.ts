import { onUnmounted, type Ref, ref } from "vue";

import { normalizeRoomCode } from "@/net/roomCode";

export function useRoomCode(): Ref<string | null> {
  const roomCode = ref(normalizeRoomCode(location.hash));
  const updateFromHash = () => {
    roomCode.value = normalizeRoomCode(location.hash);
  };
  window.addEventListener("hashchange", updateFromHash);
  onUnmounted(() => {
    window.removeEventListener("hashchange", updateFromHash);
  });
  return roomCode;
}
