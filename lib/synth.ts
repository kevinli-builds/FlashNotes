// Shared tone synthesis: turn a Timbre recipe into a Web Audio note. Used by both the
// pitch trainer (prompts) and the interval trainer. `when` offsets the start so callers
// can sequence notes (e.g. an ascending interval).

import { TIMBRES, type TimbreId } from "./instruments";

export function playTimbre(ctx: AudioContext, freq: number, dur: number, timbreId: TimbreId = "sine", when = 0): void {
  const timbre = TIMBRES[timbreId] ?? TIMBRES.sine;

  const n = timbre.partials.length + 1;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  timbre.partials.forEach((amp, i) => {
    imag[i + 1] = amp;
  });
  const o = ctx.createOscillator();
  o.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  o.frequency.value = freq;

  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);

  const peak = 0.22;
  const sus = peak * timbre.sustain;
  const t = ctx.currentTime + when;
  const dEnd = t + timbre.attack + timbre.decay;
  const relStart = Math.max(dEnd, t + dur - timbre.release);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + timbre.attack);
  g.gain.linearRampToValueAtTime(sus, dEnd);
  g.gain.setValueAtTime(sus, relStart);
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.start(t);
  o.stop(t + dur + 0.05);
}
