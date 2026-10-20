/**
 * Seeds are drawn outside the engine, which itself must stay free of randomness.
 */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
