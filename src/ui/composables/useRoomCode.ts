import { onUnmounted, ref, type Ref } from "vue";
import { normalizeRoomCode } from "../../net/roomCode";

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

export function openRoom(roomCode: string): void {
  location.hash = roomCode;
}

export function leaveRoom(): void {
  history.pushState(null, "", location.pathname);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
