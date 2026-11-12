export const TUTORIAL_ROOM_CODE = "tutorial";
export const DEV_ROOM_CODE = "dev";

export function openRoom(roomCode: string): void {
  location.hash = roomCode;
}

export function openTutorial(): void {
  location.hash = TUTORIAL_ROOM_CODE;
}

export function openDevMode(): void {
  location.hash = DEV_ROOM_CODE;
}

export function leaveRoom(): void {
  history.pushState(null, "", location.pathname);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
