import { describe, it, expect } from "vitest";
import { autoCorrelate } from "./pitch";

const SR = 44100;
const N = 2048;

function sine(freq: number, amp = 0.5): Float32Array {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = Math.sin((2 * Math.PI * freq * i) / SR) * amp;
  return buf;
}

describe("autoCorrelate", () => {
  it("detects pure sine tones within 1Hz", () => {
    for (const f of [110, 220, 261.63, 440, 880]) {
      const got = autoCorrelate(sine(f), SR);
      expect(Math.abs(got - f)).toBeLessThan(1);
    }
  });

  it("detects a note buried in a little noise", () => {
    const buf = sine(440, 0.5);
    for (let i = 0; i < N; i++) buf[i] += (Math.random() - 0.5) * 0.05;
    expect(Math.abs(autoCorrelate(buf, SR) - 440)).toBeLessThan(5);
  });

  it("returns -1 for silence", () => {
    expect(autoCorrelate(new Float32Array(N), SR)).toBe(-1);
  });

  it("returns -1 for near-silent noise", () => {
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) buf[i] = (Math.random() - 0.5) * 0.002;
    expect(autoCorrelate(buf, SR)).toBe(-1);
  });
});
