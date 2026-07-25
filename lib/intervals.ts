// Interval ear-training data. Pure — unit-testable in the node env.

export interface Interval {
  semitones: number;
  short: string;
  name: string;
}

export const INTERVALS: Interval[] = [
  { semitones: 1, short: "m2", name: "Minor 2nd" },
  { semitones: 2, short: "M2", name: "Major 2nd" },
  { semitones: 3, short: "m3", name: "Minor 3rd" },
  { semitones: 4, short: "M3", name: "Major 3rd" },
  { semitones: 5, short: "P4", name: "Perfect 4th" },
  { semitones: 6, short: "TT", name: "Tritone" },
  { semitones: 7, short: "P5", name: "Perfect 5th" },
  { semitones: 8, short: "m6", name: "Minor 6th" },
  { semitones: 9, short: "M6", name: "Major 6th" },
  { semitones: 10, short: "m7", name: "Minor 7th" },
  { semitones: 11, short: "M7", name: "Major 7th" },
  { semitones: 12, short: "P8", name: "Octave" },
];

// A friendly starting set (skip the trickier semitone/tritone/7ths by default).
export const DEFAULT_INTERVALS = [2, 4, 5, 7, 9, 12];

export type Direction = "ascending" | "descending" | "harmonic";
export const DIRECTIONS: Direction[] = ["ascending", "descending", "harmonic"];

export const intervalBySemis = (s: number): Interval | undefined => INTERVALS.find((i) => i.semitones === s);

/** Pick a random member of a list (optionally avoiding the previous value). */
export function pickRandom<T>(list: T[], avoid?: T, rng: () => number = Math.random): T {
  if (list.length <= 1) return list[0];
  let v: T;
  do {
    v = list[Math.floor(rng() * list.length)];
  } while (v === avoid);
  return v;
}
