export function openRoom(roomCode: string): void {
  location.hash = roomCode;
}

export function leaveRoom(): void {
  history.pushState(null, "", location.pathname);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
