import { describe, expect, it } from "vitest";
import { createMulberry32, isValidSeed, shuffle } from "./random";

const SAMPLE_SIZE = 1000;

function sample(seed: number): number[] {
  const random = createMulberry32(seed);
  return Array.from({ length: SAMPLE_SIZE }, () => random());
}

describe("createMulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    expect(sample(42)).toEqual(sample(42));
  });

  it("produces different sequences for different seeds", () => {
    expect(sample(42)).not.toEqual(sample(43));
  });

  it("stays within [0, 1)", () => {
    expect(sample(7).every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("shuffle", () => {
  const items = Array.from({ length: 52 }, (_, index) => index);

  it("returns a permutation without mutating the input", () => {
    const original = [...items];
    const shuffled = shuffle(items, 1);
    expect(items).toEqual(original);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });

  it("is deterministic per seed", () => {
    expect(shuffle(items, 99)).toEqual(shuffle(items, 99));
    expect(shuffle(items, 99)).not.toEqual(shuffle(items, 100));
  });
});

describe("isValidSeed", () => {
  it("accepts unsigned 32-bit integers only", () => {
    expect(isValidSeed(0)).toBe(true);
    expect(isValidSeed(2 ** 32 - 1)).toBe(true);
    expect(isValidSeed(2 ** 32)).toBe(false);
    expect(isValidSeed(-1)).toBe(false);
    expect(isValidSeed(1.5)).toBe(false);
    expect(isValidSeed(Number.NaN)).toBe(false);
  });
});
