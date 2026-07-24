"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  midiToFreq,
  freqToMidi,
  midiToName,
  midiToSolfege,
  allowedMidis,
  pickNext,
  staffInfo,
  NOTE_NAMES,
  type ScaleId,
} from "@/lib/music";
import { autoCorrelate } from "@/lib/pitch";
import {
  CHORDS,
  PROGRESSIONS,
  MELODIES,
  keyRootMidi,
  buildChordSequence,
  buildProgressionSequence,
  buildMelodySequence,
  type Sequence,
} from "@/lib/repertoire";
import {
  emptyStats,
  coerceStats,
  recordResult,
  withBestStreak,
  addPracticeMs,
  accuracy,
  totals,
  hardestPcs,
  type Stats,
} from "@/lib/stats";

const STATS_KEY = "flashnotes.stats";
const todayStr = () => new Date().toISOString().slice(0, 10);
function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

type Mode = "instrument" | "sing";
type Display = "name" | "solfege" | "staff" | "hidden";
type Source = "single" | "chords" | "progressions" | "melodies";

interface Cfg {
  mode: Mode;
  display: Display;
  source: Source;
  scale: ScaleId;
  pickId: string; // "random" or a specific drill id
  keyPc: number; // 0-11, key root pitch class for chords/progressions/melodies
  low: number;
  high: number;
  tol: number;
  hold: number;
  autoplay: boolean;
}

const PRESETS: { label: string; value: string }[] = [
  { label: "Custom range", value: "" },
  { label: "Voice / vocal (G3–E5)", value: "55,76" },
  { label: "Guitar (E2–E4)", value: "40,64" },
  { label: "Bass (E1–G3)", value: "28,55" },
  { label: "Piano — middle (C3–C6)", value: "48,84" },
  { label: "Violin (G3–C6)", value: "55,84" },
  { label: "Flute (Bb3–G5)", value: "58,79" },
];

const SINGLE_SEQ = (midi: number): Sequence => ({
  title: "",
  subtitle: "",
  notes: [midi],
  labels: [midiToName(midi)],
  groupStarts: [0],
});

/** Declarative SVG staff — treble/bass chosen by register, with ledger lines. */
function Staff({ midi }: { midi: number }) {
  const gap = 12;
  const topLineY = 45;
  const cx = 250;
  const treble = midi >= 60;
  const lineYs = [0, 1, 2, 3, 4].map((i) => topLineY + i * gap);
  const bottomLineY = lineYs[4];
  const bottomDiatonic = treble ? 30 : 18; // E4 / G2
  const { diatonic, isSharp } = staffInfo(midi);
  const step = gap / 2;
  const y = bottomLineY - (diatonic - bottomDiatonic) * step;
  const topDiatonic = bottomDiatonic + 8;

  const ledgers: number[] = [];
  if (diatonic < bottomDiatonic) {
    for (let d = bottomDiatonic - 2; d >= diatonic; d -= 2) ledgers.push(d);
  }
  if (diatonic > topDiatonic) {
    for (let d = topDiatonic + 2; d <= diatonic; d += 2) ledgers.push(d);
  }
  const up = y > topLineY + 2 * gap;

  return (
    <svg className="staff" viewBox="0 0 420 150" xmlns="http://www.w3.org/2000/svg">
      {lineYs.map((ly, i) => (
        <line key={i} x1={30} x2={400} y1={ly} y2={ly} stroke="var(--muted)" strokeWidth={1.4} opacity={0.6} />
      ))}
      <text x={36} y={treble ? topLineY + 4 * gap : topLineY + 3 * gap} fontSize={treble ? 74 : 52} fill="var(--text)">
        {treble ? "𝄞" : "𝄢"}
      </text>
      {ledgers.map((d, i) => {
        const ly = bottomLineY - (d - bottomDiatonic) * step;
        return <line key={`l${i}`} x1={cx - 16} x2={cx + 16} y1={ly} y2={ly} stroke="var(--muted)" strokeWidth={1.4} opacity={0.6} />;
      })}
      <ellipse cx={cx} cy={y} rx={9} ry={6.6} fill="var(--accent)" transform={`rotate(-20 ${cx} ${y})`} />
      <line x1={up ? cx + 8 : cx - 8} x2={up ? cx + 8 : cx - 8} y1={y} y2={up ? y - 42 : y + 42} stroke="var(--accent)" strokeWidth={2.2} />
      {isSharp && (
        <text x={cx - 30} y={y + 6} fontSize={26} fill="var(--text)">
          ♯
        </text>
      )}
    </svg>
  );
}

const clampRange = (lo: number, hi: number): [number, number] => {
  if (lo > hi - 1) hi = lo + 1;
  if (hi < lo + 1) lo = hi - 1;
  return [lo, hi];
};

const drillList = (source: Source) =>
  source === "chords" ? CHORDS : source === "progressions" ? PROGRESSIONS : source === "melodies" ? MELODIES : [];

export default function Trainer() {
  const [cfg, setCfg] = useState<Cfg>({
    mode: "instrument",
    display: "name",
    source: "single",
    scale: "naturals",
    pickId: "random",
    keyPc: 0,
    low: 55,
    high: 76,
    tol: 35,
    hold: 400,
    autoplay: true,
  });
  const [preset, setPreset] = useState("");
  const [running, setRunning] = useState(false);
  const [seq, setSeq] = useState<Sequence | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState({ streak: 0, correct: 0, best: 0 });
  const [starting, setStarting] = useState(false);
  const [stats, setStatsState] = useState<Stats>(emptyStats);

  // Loop-critical mutable state (avoids stale closures + per-frame re-renders).
  const cfgRef = useRef(cfg);
  const seqRef = useRef<{ notes: number[]; idx: number } | null>(null);
  const sessRef = useRef({ lastTarget: null as number | null, lastDrillId: "", inTuneSince: 0, cooldownUntil: 0, gateUntil: 0, running: false, presentedAt: 0 });
  const smoothRef = useRef<number | null>(null);
  const statsRef = useRef<Stats>(emptyStats());
  const streakRef = useRef(0);
  const sessionStartRef = useRef(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const needleRef = useRef<HTMLDivElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const detectedRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);

  // Load persisted stats once, then keep localStorage in sync.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        const s = coerceStats(JSON.parse(raw));
        statsRef.current = s;
        setStatsState(s);
      }
    } catch {
      /* corrupt or unavailable storage — start fresh */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      /* storage full or blocked — non-fatal */
    }
  }, [stats]);

  const commitStats = useCallback((next: Stats) => {
    statsRef.current = next;
    setStatsState(next);
  }, []);

  const resetStats = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Clear all your saved practice stats? This can't be undone.")) return;
    const e = emptyStats();
    statsRef.current = e;
    setStatsState(e);
    streakRef.current = 0;
  }, []);

  const setStatus = (text: string, cls = "") => {
    if (statusRef.current) {
      statusRef.current.textContent = text;
      statusRef.current.className = "statusline " + cls;
    }
  };

  const ensureCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback(
    (freq: number, dur = 0.8) => {
      const ctx = ensureCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.02);
      g.gain.setValueAtTime(0.22, t + dur - 0.1);
      g.gain.linearRampToValueAtTime(0, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    },
    [ensureCtx],
  );

  // Play a prompt tone AND gate the mic until it finishes (+ a short tail), so the
  // reference tone leaking through the speakers can't be mistaken for a correct hit.
  // Timing of the note starts when the gate lifts, not when the tone begins.
  const playPrompt = useCallback(
    (freq: number, dur: number) => {
      playTone(freq, dur);
      const until = performance.now() + dur * 1000 + 180;
      sessRef.current.gateUntil = until;
      sessRef.current.presentedAt = until;
      sessRef.current.inTuneSince = 0;
    },
    [playTone],
  );

  const successChime = useCallback(
    (base: number) => {
      const ctx = ensureCtx();
      [0, 4, 7].forEach((semi, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = base * Math.pow(2, semi / 12);
        o.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.06;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.16, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.35);
        o.start(t);
        o.stop(t + 0.36);
      });
    },
    [ensureCtx],
  );

  // Pick a drill by id, or random (avoiding an immediate repeat).
  const pickDrill = useCallback(<T extends { id: string }>(list: T[], pickId: string): T => {
    if (pickId !== "random") {
      const found = list.find((x) => x.id === pickId);
      if (found) return found;
    }
    let choice: T;
    do {
      choice = list[Math.floor(Math.random() * list.length)];
    } while (list.length > 1 && choice.id === sessRef.current.lastDrillId);
    sessRef.current.lastDrillId = choice.id;
    return choice;
  }, []);

  const loadNext = useCallback(() => {
    const c = cfgRef.current;
    let next: Sequence | null = null;

    if (c.source === "single") {
      const pool = allowedMidis(c.low, c.high, c.scale);
      const pick = pickNext(pool, sessRef.current.lastTarget);
      if (pick === null) {
        setStatus("No notes in this range/scale — widen the range.", "bad");
        return;
      }
      sessRef.current.lastTarget = pick;
      next = SINGLE_SEQ(pick);
    } else if (c.source === "chords") {
      next = buildChordSequence(keyRootMidi(c.keyPc, c.low, c.high), pickDrill(CHORDS, c.pickId));
    } else if (c.source === "progressions") {
      next = buildProgressionSequence(pickDrill(PROGRESSIONS, c.pickId), keyRootMidi(c.keyPc, c.low, c.high));
    } else {
      next = buildMelodySequence(pickDrill(MELODIES, c.pickId), c.keyPc, c.low, c.high);
    }

    seqRef.current = { notes: next.notes, idx: 0 };
    sessRef.current.inTuneSince = 0;
    sessRef.current.gateUntil = 0;
    sessRef.current.presentedAt = performance.now();
    setSeq(next);
    setStepIdx(0);
    setStatus(c.mode === "sing" ? "Sing this pitch…" : "Play this note…");
    if (detectedRef.current) detectedRef.current.innerHTML = "&nbsp;";
    if (c.autoplay || c.mode === "sing") playPrompt(midiToFreq(next.notes[0]), 0.9);
  }, [playPrompt, pickDrill]);

  const onNoteHit = useCallback(() => {
    const sref = seqRef.current;
    if (!sref || sref.idx >= sref.notes.length) return;
    const now = performance.now();
    const hitNote = sref.notes[sref.idx];
    const ms = now - sessRef.current.presentedAt;

    const newStreak = streakRef.current + 1;
    streakRef.current = newStreak;
    setScore((s) => ({ correct: s.correct + 1, streak: newStreak, best: Math.max(s.best, newStreak) }));
    commitStats(withBestStreak(recordResult(statsRef.current, hitNote, true, ms, todayStr()), newStreak));
    if (needleRef.current) needleRef.current.style.opacity = "0";

    const nextIdx = sref.idx + 1;
    const c = cfgRef.current;
    if (nextIdx >= sref.notes.length) {
      // Whole sequence complete.
      setStatus(sref.notes.length > 1 ? "✓ Complete!" : "✓ Nice!", "good");
      successChime(midiToFreq(sref.notes[sref.idx]));
      sref.idx = nextIdx; // park past the end
      sessRef.current.cooldownUntil = now + 800;
      sessRef.current.inTuneSince = 0;
      setTimeout(() => {
        if (sessRef.current.running) loadNext();
      }, 850);
    } else {
      // Advance to the next note in the sequence.
      sref.idx = nextIdx;
      sessRef.current.inTuneSince = 0;
      sessRef.current.cooldownUntil = now + 300; // debounce re-trigger
      sessRef.current.gateUntil = 0;
      sessRef.current.presentedAt = now; // start timing the next note
      setStepIdx(nextIdx);
      setStatus("✓ next…", "good");
      if (c.autoplay || c.mode === "sing") playPrompt(midiToFreq(sref.notes[nextIdx]), 0.7);
    }
  }, [successChime, loadNext, playPrompt, commitStats]);

  const loop = useCallback(() => {
    rafRef.current = requestAnimationFrame(loop);
    const analyser = analyserRef.current;
    const buf = bufRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !buf || !ctx) return;
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, ctx.sampleRate);
    const now = performance.now();

    if (freq < 0) {
      if (needleRef.current) needleRef.current.style.opacity = "0.25";
      if (detectedRef.current) detectedRef.current.innerHTML = '<span style="opacity:.6">listening…</span>';
      sessRef.current.inTuneSince = 0;
      return;
    }

    const raw = freqToMidi(freq);
    smoothRef.current = smoothRef.current === null ? raw : smoothRef.current * 0.6 + raw * 0.4;
    const smooth = smoothRef.current;
    const nearest = Math.round(smooth);
    const centsNear = Math.round((smooth - nearest) * 100);
    if (detectedRef.current) {
      detectedRef.current.innerHTML = "heard <b>" + midiToName(nearest) + "</b> (" + (centsNear >= 0 ? "+" : "") + centsNear + "¢)";
    }

    const sref = seqRef.current;
    const tgt = sref && sref.idx < sref.notes.length ? sref.notes[sref.idx] : null;
    if (tgt === null) return;
    // While the prompt tone is sounding, don't match — otherwise the tone bleeding
    // through the speakers into the mic reads as an instant (false) hit.
    if (now < sessRef.current.gateUntil) {
      if (needleRef.current) needleRef.current.style.opacity = "0.25";
      setStatus("♪ playing prompt…");
      return;
    }
    if (now < sessRef.current.cooldownUntil) return;

    const c = cfgRef.current;
    const centsTgt = (smooth - tgt) * 100;
    const clamped = Math.max(-100, Math.min(100, centsTgt));
    if (needleRef.current) {
      needleRef.current.style.opacity = "1";
      needleRef.current.style.left = 50 + clamped / 2 + "%";
      const within = Math.abs(centsTgt) <= c.tol;
      needleRef.current.style.background = within ? "var(--good)" : Math.abs(centsTgt) < c.tol * 2 ? "var(--warn)" : "var(--bad)";
    }
    if (zoneRef.current) zoneRef.current.style.width = c.tol + "%";

    if (Math.abs(centsTgt) <= c.tol) {
      if (sessRef.current.inTuneSince === 0) sessRef.current.inTuneSince = now;
      const held = now - sessRef.current.inTuneSince;
      if (held >= c.hold) {
        onNoteHit();
      } else {
        setStatus("Hold it… (" + Math.ceil((c.hold - held) / 100) / 10 + "s)", "warn");
      }
    } else {
      sessRef.current.inTuneSince = 0;
      setStatus(centsTgt > 0 ? "A bit sharp — lower it" : "A bit flat — raise it");
    }
  }, [onNoteHit]);

  const startMic = useCallback(async () => {
    const ctx = ensureCtx();
    if (ctx.state === "suspended") await ctx.resume();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    streamRef.current = stream;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    bufRef.current = new Float32Array(analyser.fftSize);
    src.connect(analyser);
    analyserRef.current = analyser;
  }, [ensureCtx]);

  const stop = useCallback(() => {
    sessRef.current.running = false;
    setRunning(false);
    if (sessionStartRef.current) {
      commitStats(addPracticeMs(statsRef.current, performance.now() - sessionStartRef.current));
      sessionStartRef.current = 0;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    seqRef.current = null;
    setSeq(null);
    if (needleRef.current) needleRef.current.style.opacity = "0";
    if (detectedRef.current) detectedRef.current.innerHTML = "&nbsp;";
    setStatus("Stopped");
  }, [commitStats]);

  const start = useCallback(async () => {
    try {
      setStarting(true);
      await startMic();
      sessRef.current.running = true;
      setRunning(true);
      setStarting(false);
      smoothRef.current = null;
      streakRef.current = 0;
      sessionStartRef.current = performance.now();
      loop();
      loadNext();
    } catch (err) {
      setStarting(false);
      setStatus("Mic blocked — allow microphone access and retry.", "bad");
      console.error(err);
    }
  }, [startMic, loop, loadNext]);

  const replay = useCallback(() => {
    const sref = seqRef.current;
    if (sref && sref.idx < sref.notes.length) playPrompt(midiToFreq(sref.notes[sref.idx]), 0.9);
  }, [playPrompt]);

  const skip = useCallback(() => {
    if (!sessRef.current.running) return;
    const sref = seqRef.current;
    if (sref && sref.idx < sref.notes.length) {
      commitStats(recordResult(statsRef.current, sref.notes[sref.idx], false, 0, todayStr()));
    }
    streakRef.current = 0;
    setScore((s) => ({ ...s, streak: 0 }));
    loadNext();
  }, [loadNext, commitStats]);

  // Keyboard: space = replay, right arrow = skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!sessRef.current.running) return;
      if (e.code === "Space") {
        e.preventDefault();
        replay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [replay, skip]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const update = (patch: Partial<Cfg>) => setCfg((c) => ({ ...c, ...patch }));

  const isSeq = seq !== null && seq.notes.length > 1;
  const current = seq !== null && stepIdx < seq.notes.length ? seq.notes[stepIdx] : null;
  const hidden = cfg.display === "hidden";

  const promptLabel = !running
    ? "Press start to practice"
    : isSeq
      ? seq!.title
      : cfg.mode === "sing"
        ? "Match this tone"
        : "Target note";

  const subLine =
    current !== null && isSeq
      ? seq!.subtitle
      : current !== null && hidden
        ? "Listen and reproduce the tone"
        : current !== null && cfg.display !== "staff"
          ? Math.round(midiToFreq(current) * 10) / 10 + " Hz"
          : " ";

  const currentList = drillList(cfg.source);

  const tot = totals(stats);
  const hard = hardestPcs(stats, 3).slice(0, 3);
  const recentDays = stats.sessions.slice(-14);

  return (
    <div className="wrap">
      <header>
        <h1>
          FlashNotes<span className="dot">.</span>
        </h1>
        <div className="tag">musical flashcards · listens through your mic</div>
      </header>

      <div className="stage">
        <div className="prompt-label">{promptLabel}</div>

        {isSeq && (
          <div className="seq-row">
            {seq!.labels.map((lbl, i) => (
              <span
                key={i}
                className={"seq-chip" + (i === stepIdx ? " current" : i < stepIdx ? " done" : "")}
                style={i > 0 && seq!.groupStarts.includes(i) ? { marginLeft: 14 } : undefined}
              >
                {hidden ? "•" : lbl}
              </span>
            ))}
          </div>
        )}

        <div>
          {cfg.display === "staff" && current !== null ? (
            <Staff midi={current} />
          ) : (
            <div className="target-name">
              {current === null ? (
                "—"
              ) : hidden ? (
                <span style={{ color: "var(--muted)" }}>? ? ?</span>
              ) : (
                (() => {
                  const label = cfg.display === "solfege" ? midiToSolfege(current) : midiToName(current);
                  const oct = label.match(/-?\d+$/)![0];
                  const base = label.slice(0, label.length - oct.length);
                  return (
                    <>
                      {base}
                      <span className="oct">{oct}</span>
                    </>
                  );
                })()
              )}
            </div>
          )}
        </div>
        <div className="target-sub">{subLine}</div>

        <div className="tuner">
          <div className="tuner-track">
            <div className="tuner-zone" ref={zoneRef} />
            <div className="tuner-center" />
            <div className="tuner-needle" ref={needleRef} style={{ left: "50%", opacity: 0 }} />
          </div>
          <div className="tuner-labels">
            <span>♭ flat</span>
            <span>in tune</span>
            <span>sharp ♯</span>
          </div>
        </div>

        <div className="detected" ref={detectedRef}>
          &nbsp;
        </div>
        <div className="statusline" ref={statusRef}>
          &nbsp;
        </div>

        <div className="controls">
          <button className={running ? "" : "primary"} onClick={running ? stop : start} disabled={starting}>
            {starting ? "…" : running ? "⏹ Stop" : "▶ Start"}
          </button>
          <button className="icon-btn" onClick={replay} disabled={!running} title="Play the target note">
            🔊 Hear it
          </button>
          <button onClick={skip} disabled={!running}>
            Skip →
          </button>
        </div>
        <div className="scorebar">
          <span>
            Streak <b>{score.streak}</b>
          </span>
          <span>
            Correct <b>{score.correct}</b>
          </span>
          <span>
            Best <b>{score.best}</b>
          </span>
        </div>
      </div>

      <details className="settings">
        <summary>Practice settings</summary>
        <div className="grid">
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Mode</label>
            <div className="seg">
              <button className={cfg.mode === "instrument" ? "on" : ""} onClick={() => update({ mode: "instrument" })}>
                🎸 Play it (instrument)
              </button>
              <button className={cfg.mode === "sing" ? "on" : ""} onClick={() => update({ mode: "sing" })}>
                🎤 Sing it (match the tone)
              </button>
            </div>
            <div className="hint">
              {cfg.mode === "sing"
                ? "A tone plays — sing it back. It advances when your voice matches the pitch."
                : "A note appears — play it on your instrument. It advances when the mic hears the right pitch."}
            </div>
          </div>

          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Practice</label>
            <div className="seg">
              {(["single", "chords", "progressions", "melodies"] as Source[]).map((s) => (
                <button
                  key={s}
                  className={cfg.source === s ? "on" : ""}
                  onClick={() => update({ source: s, pickId: "random" })}
                >
                  {s === "single" ? "Single notes" : s === "chords" ? "Chords" : s === "progressions" ? "Progressions" : "Melodies"}
                </button>
              ))}
            </div>
            <div className="hint">
              {cfg.source === "single"
                ? "Random single notes from your range and scale."
                : cfg.source === "chords"
                  ? "Chords are arpeggiated — play each tone in turn (detection is one note at a time)."
                  : cfg.source === "progressions"
                    ? "Common chord progressions, one arpeggiated chord after another."
                    : "Public-domain melodies, played note by note. Transposable to any key."}
            </div>
          </div>

          {cfg.source !== "single" && (
            <>
              <div className="field">
                <label>Which</label>
                <select value={cfg.pickId} onChange={(e) => update({ pickId: e.target.value })}>
                  <option value="random">Random / mix</option>
                  {currentList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Key</label>
                <select value={cfg.keyPc} onChange={(e) => update({ keyPc: +e.target.value })}>
                  {NOTE_NAMES.map((n, i) => (
                    <option key={n} value={i}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Show the note as</label>
            <div className="seg">
              {(["name", "solfege", "staff", "hidden"] as Display[]).map((d) => (
                <button key={d} className={cfg.display === d ? "on" : ""} onClick={() => update({ display: d })}>
                  {d === "name" ? "Letter (C, D…)" : d === "solfege" ? "Solfège (Do, Re…)" : d === "staff" ? "Staff notation" : "Nothing (ear only)"}
                </button>
              ))}
            </div>
            <div className="hint">&quot;Nothing&quot; hides the answer — pure ear training.</div>
          </div>

          <div className="field">
            <label>
              Lowest note <span className="rangeval">{midiToName(cfg.low)}</span>
            </label>
            <input
              type="range"
              min={36}
              max={83}
              value={cfg.low}
              onChange={(e) => {
                const [lo, hi] = clampRange(+e.target.value, cfg.high);
                update({ low: lo, high: hi });
                setPreset("");
              }}
            />
          </div>
          <div className="field">
            <label>
              Highest note <span className="rangeval">{midiToName(cfg.high)}</span>
            </label>
            <input
              type="range"
              min={37}
              max={96}
              value={cfg.high}
              onChange={(e) => {
                const [lo, hi] = clampRange(cfg.low, +e.target.value);
                update({ low: lo, high: hi });
                setPreset("");
              }}
            />
          </div>

          <div className="field">
            <label>Instrument preset</label>
            <select
              value={preset}
              onChange={(e) => {
                setPreset(e.target.value);
                if (e.target.value) {
                  const [lo, hi] = e.target.value.split(",").map(Number);
                  update({ low: lo, high: hi });
                }
              }}
            >
              {PRESETS.map((p) => (
                <option key={p.label} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Notes allowed (single-note mode)</label>
            <select value={cfg.scale} onChange={(e) => update({ scale: e.target.value as ScaleId })}>
              <option value="chromatic">Chromatic (all 12)</option>
              <option value="naturals">Naturals only (no sharps/flats)</option>
              <option value="major">C major scale</option>
              <option value="minor">A natural minor</option>
              <option value="pentatonic">C major pentatonic</option>
              <option value="blues">A blues scale</option>
            </select>
          </div>

          <div className="field">
            <label>
              Tolerance <span className="rangeval">{cfg.tol}¢</span>
            </label>
            <input type="range" min={15} max={60} value={cfg.tol} onChange={(e) => update({ tol: +e.target.value })} />
            <div className="hint">How close (in cents) counts as correct.</div>
          </div>
          <div className="field">
            <label>
              Hold to confirm <span className="rangeval">{cfg.hold} ms</span>
            </label>
            <input type="range" min={0} max={1200} step={100} value={cfg.hold} onChange={(e) => update({ hold: +e.target.value })} />
            <div className="hint">How long you must sustain each note.</div>
          </div>

          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Auto-play the target tone as a prompt</label>
            <div className="seg">
              <button className={cfg.autoplay ? "on" : ""} onClick={() => update({ autoplay: true })}>
                On
              </button>
              <button className={!cfg.autoplay ? "on" : ""} onClick={() => update({ autoplay: false })}>
                Off
              </button>
            </div>
          </div>
        </div>
      </details>

      <details className="settings">
        <summary>Your progress</summary>
        <div className="stats-body">
          <div className="stat-tiles">
            <div className="stat-tile">
              <b>{tot.prompts}</b>
              <span>notes practiced</span>
            </div>
            <div className="stat-tile">
              <b>{tot.prompts ? Math.round(tot.accuracy * 100) + "%" : "–"}</b>
              <span>accuracy</span>
            </div>
            <div className="stat-tile">
              <b>{stats.bestStreak}</b>
              <span>best streak</span>
            </div>
            <div className="stat-tile">
              <b>{formatDuration(stats.totalMs)}</b>
              <span>practice time</span>
            </div>
          </div>

          {tot.prompts === 0 ? (
            <div className="hint">No data yet — start practicing and your accuracy per note will appear here. Stats are saved on this device only.</div>
          ) : (
            <>
              <div className="stat-section-title">Accuracy by note</div>
              <div className="pc-bars">
                {NOTE_NAMES.map((name, pc) => {
                  const n = stats.byPc[pc];
                  const acc = accuracy(n);
                  const cls = n.prompts === 0 ? "empty" : acc >= 0.8 ? "good" : acc >= 0.5 ? "warn" : "bad";
                  return (
                    <div className="pc-bar" key={pc}>
                      <span className="pc-name">{name}</span>
                      <div className="pc-track">
                        <div className={"pc-fill " + cls} style={{ width: (n.prompts ? acc * 100 : 0) + "%" }} />
                      </div>
                      <span className="pc-val">{n.prompts ? Math.round(acc * 100) + "%" : "–"}</span>
                      <span className="pc-count">{n.prompts ? n.prompts + "×" : ""}</span>
                    </div>
                  );
                })}
              </div>

              {hard.length > 0 && (
                <>
                  <div className="stat-section-title">Toughest notes</div>
                  <div className="tough-row">
                    {hard.map((pc) => (
                      <span className="tough-chip" key={pc}>
                        {NOTE_NAMES[pc]} · {Math.round(accuracy(stats.byPc[pc]) * 100)}%
                      </span>
                    ))}
                  </div>
                </>
              )}

              {recentDays.length > 1 && (
                <>
                  <div className="stat-section-title">Recent accuracy (per day)</div>
                  <div className="day-bars">
                    {recentDays.map((d, i) => {
                      const acc = d.prompts ? d.hits / d.prompts : 0;
                      return (
                        <div className="day-bar" key={i} title={`${d.date}: ${d.hits}/${d.prompts} (${Math.round(acc * 100)}%)`}>
                          <div className="day-fill" style={{ height: Math.max(4, acc * 100) + "%" }} />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <button className="reset-btn" onClick={resetStats}>
                Reset stats
              </button>
            </>
          )}
        </div>
      </details>

      <div className="foot">
        Runs entirely in your browser — audio never leaves your device. Best in Chrome/Edge/Safari with a decent mic.
        <br />
        Pitch detection is monophonic — one clear note at a time (chords are practiced by arpeggiating).
      </div>
    </div>
  );
}
