const ROOM_CODE_LENGTH = 6;
// Without 0/O and 1/I/L so codes can be read out loud and typed without confusion.
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${String(ROOM_CODE_LENGTH)}}$`);

export function createRoomCode(randomValues: Uint32Array): string {
  return Array.from(
    randomValues.slice(0, ROOM_CODE_LENGTH),
    (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length],
  ).join("");
}

export function randomRoomCode(): string {
  return createRoomCode(crypto.getRandomValues(new Uint32Array(ROOM_CODE_LENGTH)));
}

export function normalizeRoomCode(input: string): string | null {
  const candidate = input.trim().replace(/^#/, "").toUpperCase();
  return ROOM_CODE_PATTERN.test(candidate) ? candidate : null;
}

export function roomLink(
  location: Pick<Location, "origin" | "pathname">,
  roomCode: string,
): string {
  return `${location.origin}${location.pathname}#${roomCode}`;
}
