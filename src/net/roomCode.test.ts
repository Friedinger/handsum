import { describe, expect, it } from "vitest";
import { createRoomCode, normalizeRoomCode, roomLink } from "./roomCode";

describe("room codes", () => {
  it("creates six-character codes that normalize to themselves", () => {
    const code = createRoomCode(new Uint32Array([0, 1, 2, 3, 4, 30]));
    expect(code).toBe("ABCDE9");
    expect(normalizeRoomCode(code)).toBe(code);
  });

  it("accepts hashes and lower case, rejects anything else", () => {
    expect(normalizeRoomCode("#abcde9")).toBe("ABCDE9");
    expect(normalizeRoomCode("ABCDE")).toBeNull();
    expect(normalizeRoomCode("ABCDE0")).toBeNull();
    expect(normalizeRoomCode("")).toBeNull();
  });

  it("builds a shareable link with the code in the hash", () => {
    const location = { origin: "https://example.org", pathname: "/handsum/" };
    expect(roomLink(location, "ABCDE9")).toBe("https://example.org/handsum/#ABCDE9");
  });
});
