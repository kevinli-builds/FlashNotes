import { describe, it, expect } from "vitest";
import { INTERVALS, DEFAULT_INTERVALS, intervalBySemis, pickRandom } from "./intervals";

describe("intervals", () => {
  it("covers all 12 semitones uniquely", () => {
    expect(INTERVALS.length).toBe(12);
    expect(new Set(INTERVALS.map((i) => i.semitones)).size).toBe(12);
    expect(INTERVALS.map((i) => i.semitones)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("has a short label and name for each", () => {
    for (const i of INTERVALS) {
      expect(i.short.length).toBeGreaterThan(0);
      expect(i.name.length).toBeGreaterThan(0);
    }
  });

  it("looks up by semitones", () => {
    expect(intervalBySemis(7)?.short).toBe("P5");
    expect(intervalBySemis(12)?.name).toBe("Octave");
    expect(intervalBySemis(99)).toBeUndefined();
  });

  it("default set is a subset of all intervals", () => {
    for (const s of DEFAULT_INTERVALS) expect(intervalBySemis(s)).toBeDefined();
  });
});

describe("pickRandom", () => {
  it("avoids the previous value when possible", () => {
    for (let i = 0; i < 50; i++) expect(pickRandom([1, 2, 3], 2)).not.toBe(2);
  });
  it("returns the only item even if it equals avoid", () => {
    expect(pickRandom([5], 5)).toBe(5);
  });
});
