const UINT32_RANGE = 2 ** 32;
const MULBERRY32_INCREMENT = 0x6d2b79f5;

export type RandomSource = () => number;

export function isValidSeed(seed: number): boolean {
  return Number.isInteger(seed) && seed >= 0 && seed < UINT32_RANGE;
}

export function createMulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY32_INCREMENT) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const random = createMulberry32(seed);
  const remaining = [...items];
  const shuffled: T[] = [];
  while (remaining.length > 0) {
    const pickIndex = Math.floor(random() * remaining.length);
    shuffled.push(...remaining.splice(pickIndex, 1));
  }
  return shuffled;
}
