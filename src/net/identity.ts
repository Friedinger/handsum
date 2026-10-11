import type { PlayerId } from "../engine";

const PLAYER_ID_KEY = "handsum.playerId";
const PLAYER_NAME_KEY = "handsum.playerName";
const ROOM_HOSTS_KEY = "handsum.roomHosts";
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

export function loadPlayerName(): string {
  return readItem(localStorage, PLAYER_NAME_KEY) ?? "";
}

export function savePlayerName(name: string): void {
  writeItem(localStorage, PLAYER_NAME_KEY, name);
}

function loadRoomHosts(): Record<string, PlayerId> {
  try {
    const parsed: unknown = JSON.parse(readItem(localStorage, ROOM_HOSTS_KEY) ?? "{}");
    return typeof parsed === "object" && parsed !== null
      ? Object.fromEntries(
          Object.entries(parsed).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        )
      : {};
  } catch {
    return {};
  }
}

export function markRoomHosted(roomCode: string, playerId: PlayerId): void {
  writeItem(
    localStorage,
    ROOM_HOSTS_KEY,
    JSON.stringify({ ...loadRoomHosts(), [roomCode]: playerId }),
  );
}

export function isRoomHost(roomCode: string, playerId: PlayerId): boolean {
  return loadRoomHosts()[roomCode] === playerId;
}

// Per tab, so a reload rejoins directly while a fresh tab asks for the name again.
export function rememberJoinedRoom(roomCode: string): void {
  writeItem(sessionStorage, JOINED_ROOM_KEY, roomCode);
}

export function hasJoinedRoom(roomCode: string): boolean {
  return readItem(sessionStorage, JOINED_ROOM_KEY) === roomCode;
}
