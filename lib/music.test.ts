import { describe, it, expect } from "vitest";
import {
  midiToFreq,
  freqToMidi,
  midiToName,
  midiToSolfege,
  centsFromMidi,
  allowedMidis,
  pickNext,
  staffInfo,
  pitchClass,
  needleOffset,
} from "./music";

describe("note math", () => {
  it("maps MIDI to names", () => {
    expect(midiToName(60)).toBe("C4");
    expect(midiToName(69)).toBe("A4");
    expect(midiToName(58)).toBe("A#3");
    expect(midiToName(48)).toBe("C3");
  });

  it("maps A4 to 440Hz and back", () => {
    expect(Math.round(midiToFreq(69))).toBe(440);
    expect(Math.round(freqToMidi(440))).toBe(69);
    expect(Math.round(freqToMidi(261.63))).toBe(60); // middle C
  });

  it("gives solfège names", () => {
    expect(midiToSolfege(62)).toBe("Re4");
    expect(midiToSolfege(60)).toBe("Do4");
  });

  it("computes cents offset from a target", () => {
    expect(Math.round(centsFromMidi(midiToFreq(69), 69))).toBe(0);
    expect(Math.round(centsFromMidi(midiToFreq(69) * Math.pow(2, 0.5 / 12), 69))).toBe(50);
    expect(Math.round(centsFromMidi(midiToFreq(69) * Math.pow(2, -0.5 / 12), 69))).toBe(-50);
  });

  it("handles pitch class for negatives", () => {
    expect(pitchClass(-1)).toBe(11);
    expect(pitchClass(12)).toBe(0);
  });
});

describe("scale filtering", () => {
  it("naturals only excludes sharps", () => {
    expect(allowedMidis(60, 72, "naturals").map(midiToName)).toEqual([
      "C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5",
    ]);
  });

  it("pentatonic uses 5 pitch classes", () => {
    const pcs = new Set(allowedMidis(48, 84, "pentatonic").map(pitchClass));
    expect([...pcs].sort((a, b) => a - b)).toEqual([0, 2, 4, 7, 9]);
  });

  it("chromatic includes everything", () => {
    expect(allowedMidis(60, 71, "chromatic").length).toBe(12);
  });
});

describe("pickNext", () => {
  it("avoids repeating the last note when possible", () => {
    const pool = [60, 62, 64];
    for (let i = 0; i < 50; i++) {
      expect(pickNext(pool, 62)).not.toBe(62);
    }
  });

  it("returns the only note even if it equals avoid", () => {
    expect(pickNext([60], 60)).toBe(60);
  });

  it("returns null for an empty pool", () => {
    expect(pickNext([], null)).toBeNull();
  });
});

describe("needleOffset", () => {
  it("is zero at the target and signed by direction", () => {
    expect(needleOffset(0)).toBe(0);
    expect(needleOffset(100)).toBeGreaterThan(0);
    expect(needleOffset(-100)).toBeLessThan(0);
  });

  it("never saturates but stays within the half-track", () => {
    expect(Math.abs(needleOffset(1200))).toBeLessThan(50);
    expect(Math.abs(needleOffset(100000))).toBeLessThan(50);
    expect(needleOffset(100)).toBeCloseTo(25); // one semitone -> quarter of the half-track
  });

  it("is monotonic — closer always reads closer", () => {
    let prev = needleOffset(0);
    for (let c = 10; c <= 1200; c += 10) {
      const v = needleOffset(c);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });

  it("keeps meaningful travel near the target for micro-adjustment", () => {
    // a 10-cent change near the target should move the needle a visible amount
    expect(needleOffset(10) - needleOffset(0)).toBeGreaterThan(3);
  });
});

describe("staffInfo", () => {
  it("places middle C two diatonic steps below treble bottom line (E4=30)", () => {
    expect(staffInfo(60).diatonic).toBe(28); // C4
    expect(staffInfo(64).diatonic).toBe(30); // E4, treble bottom line
    expect(staffInfo(61).isSharp).toBe(true); // C#4
    expect(staffInfo(60).isSharp).toBe(false);
  });
});
