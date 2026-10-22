export const TUTORIAL_HASH = "tutorial";

export function openRoom(roomCode: string): void {
  location.hash = roomCode;
}

export function openTutorial(): void {
  location.hash = TUTORIAL_HASH;
}

export function leaveRoom(): void {
  history.pushState(null, "", location.pathname);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
