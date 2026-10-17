// A small seeded random number generator (mulberry32): the same seed always gives the same numbers,
// so a level deals the same pots on every device and every load.

export type Rng = () => number;

/** Returns a function that gives numbers in [0, 1), fixed by the seed. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from lo to hi, both included. */
export function between(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}
