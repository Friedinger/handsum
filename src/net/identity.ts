import type { PlayerId } from "../engine";

const PLAYER_ID_KEY = "handsum.playerId";
const PLAYER_NAME_KEY = "handsum.playerName";
const JOINED_ROOM_KEY = "handsum.joinedRoom";
const PLAYER_LOCK_PREFIX = "handsum.player.";

function readItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    // Without storage the player simply cannot reclaim their seat after reloading.
  }
}

function holdLockIfAvailable(name: string): Promise<boolean> {
  if (!("locks" in navigator)) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    void navigator.locks.request(name, { ifAvailable: true }, (lock) => {
      resolve(lock !== null);
      return lock ? new Promise<never>(() => undefined) : undefined;
    });
  });
}

// A second tab of the same browser must not share the first tab's player ID, otherwise both
// tabs would act as the same player. The lock marks an ID as taken by a live tab.
async function claimUnusedPlayerId(): Promise<PlayerId> {
  const candidates = [
    readItem(sessionStorage, PLAYER_ID_KEY),
    readItem(localStorage, PLAYER_ID_KEY),
  ].filter((candidate) => candidate !== null);
  let claimed: PlayerId | null = null;
  for (const candidate of candidates) {
    if (await holdLockIfAvailable(PLAYER_LOCK_PREFIX + candidate)) {
      claimed = candidate;
      break;
    }
  }
  if (claimed === null) {
    claimed = crypto.randomUUID();
    await holdLockIfAvailable(PLAYER_LOCK_PREFIX + claimed);
  }
  writeItem(sessionStorage, PLAYER_ID_KEY, claimed);
  if (readItem(localStorage, PLAYER_ID_KEY) === null) {
    writeItem(localStorage, PLAYER_ID_KEY, claimed);
  }
  return claimed;
}

let claimedPlayerId: Promise<PlayerId> | null = null;

export function claimPlayerId(): Promise<PlayerId> {
  claimedPlayerId ??= claimUnusedPlayerId();
  return claimedPlayerId;
}

// The tab's own name wins over the shared one, so another tab cannot rename this player.
export function loadPlayerName(): string {
  return readItem(sessionStorage, PLAYER_NAME_KEY) ?? readItem(localStorage, PLAYER_NAME_KEY) ?? "";
}

export function savePlayerName(name: string): void {
  writeItem(sessionStorage, PLAYER_NAME_KEY, name);
  writeItem(localStorage, PLAYER_NAME_KEY, name);
}

// Per tab, so a reload rejoins directly while a fresh tab asks for the name again.
export function rememberJoinedRoom(roomCode: string): void {
  writeItem(sessionStorage, JOINED_ROOM_KEY, roomCode);
}

export function hasJoinedRoom(roomCode: string): boolean {
  return readItem(sessionStorage, JOINED_ROOM_KEY) === roomCode;
}
