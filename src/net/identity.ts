import type { PlayerId } from "../engine";

const PLAYER_ID_KEY = "handsum.playerId";
const PLAYER_NAME_KEY = "handsum.playerName";
const HOSTED_ROOMS_KEY = "handsum.hostedRooms";
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
export async function claimPlayerId(): Promise<PlayerId> {
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

export function loadPlayerName(): string {
  return readItem(localStorage, PLAYER_NAME_KEY) ?? "";
}

export function savePlayerName(name: string): void {
  writeItem(localStorage, PLAYER_NAME_KEY, name);
}

function loadHostedRooms(): string[] {
  const stored = readItem(localStorage, HOSTED_ROOMS_KEY);
  return stored ? stored.split(",") : [];
}

export function markRoomHosted(roomCode: string): void {
  writeItem(localStorage, HOSTED_ROOMS_KEY, [...loadHostedRooms(), roomCode].join(","));
}

export function isRoomHosted(roomCode: string): boolean {
  return loadHostedRooms().includes(roomCode);
}
