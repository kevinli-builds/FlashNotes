import { describe, it, expect } from "vitest";
import { VOICES, INSTRUMENTS, TIMBRES, instrumentTimbre, type TimbreId } from "./instruments";

describe("voices", () => {
  it("all have a valid ascending range and unique ids", () => {
    expect(VOICES.length).toBeGreaterThanOrEqual(5);
    for (const v of VOICES) {
      expect(v.low).toBeLessThan(v.high);
      expect(v.low).toBeGreaterThanOrEqual(24);
      expect(v.high).toBeLessThanOrEqual(96);
    }
    expect(new Set(VOICES.map((v) => v.id)).size).toBe(VOICES.length);
  });

  it("get lower as they go from bass to soprano", () => {
    const bass = VOICES.find((v) => v.id === "bass")!;
    const soprano = VOICES.find((v) => v.id === "soprano")!;
    expect(soprano.low).toBeGreaterThan(bass.low);
    expect(soprano.high).toBeGreaterThan(bass.high);
  });
});

describe("instruments", () => {
  it("all have a valid range, unique ids, and a known timbre", () => {
    for (const inst of INSTRUMENTS) {
      expect(inst.low).toBeLessThan(inst.high);
      expect(TIMBRES[inst.timbre]).toBeDefined();
    }
    expect(new Set(INSTRUMENTS.map((i) => i.id)).size).toBe(INSTRUMENTS.length);
  });

  it("resolves a timbre by id and falls back to sine", () => {
    expect(instrumentTimbre("clarinet")).toBe("clarinet");
    expect(instrumentTimbre("nope")).toBe("sine");
  });
});

describe("timbres", () => {
  it("every timbre has partials and a sane envelope", () => {
    for (const id of Object.keys(TIMBRES) as TimbreId[]) {
      const t = TIMBRES[id];
      expect(t.partials.length).toBeGreaterThan(0);
      expect(t.partials[0]).toBeGreaterThan(0);
      expect(t.sustain).toBeGreaterThanOrEqual(0);
      expect(t.sustain).toBeLessThanOrEqual(1);
      expect(t.attack).toBeGreaterThanOrEqual(0);
    }
  });
});
