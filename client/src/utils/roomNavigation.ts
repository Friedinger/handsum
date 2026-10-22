export const TUTORIAL_ROOM_CODE = "tutorial";

export function openRoom(roomCode: string): void {
  location.hash = roomCode;
}

export function openTutorial(): void {
  location.hash = TUTORIAL_ROOM_CODE;
}

export function leaveRoom(): void {
  history.pushState(null, "", location.pathname);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
