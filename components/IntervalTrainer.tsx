"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INTERVALS, DEFAULT_INTERVALS, DIRECTIONS, intervalBySemis, pickRandom, type Direction } from "@/lib/intervals";
import { midiToFreq } from "@/lib/music";
import { playTimbre, unlockAudio } from "@/lib/synth";

const ISTATS_KEY = "flashnotes.intervalStats";
interface IStat {
  prompts: number;
  correct: number;
}
type IStats = Record<number, IStat>;

function loadIStats(): IStats {
  try {
    const raw = localStorage.getItem(ISTATS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, Partial<IStat>>;
    const out: IStats = {};
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        const s = Number(k);
        const v = o[k];
        if (intervalBySemis(s) && v && typeof v === "object") {
          out[s] = { prompts: Number(v.prompts) || 0, correct: Number(v.correct) || 0 };
        }
      }
    }
    return out;
  } catch {
    return {};
  }
}

interface Cur {
  root: number;
  semis: number;
  dir: Direction;
}

export default function IntervalTrainer() {
  const [enabled, setEnabled] = useState<number[]>(DEFAULT_INTERVALS);
  const [dirMode, setDirMode] = useState<"random" | Direction>("ascending");
  const [running, setRunning] = useState(false);
  const [cur, setCur] = useState<Cur | null>(null);
  const [answered, setAnswered] = useState<{ picked: number; correct: boolean } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0, best: 0 });
  const [istats, setIStats] = useState<IStats>({});

  const ctxRef = useRef<AudioContext | null>(null);
  const curRef = useRef<Cur | null>(null);
  const answeredRef = useRef(false);
  const runningRef = useRef(false);
  const advanceRef = useRef<number | null>(null);

  useEffect(() => setIStats(loadIStats()), []);
  useEffect(() => {
    try {
      localStorage.setItem(ISTATS_KEY, JSON.stringify(istats));
    } catch {
      /* ignore */
    }
  }, [istats]);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  useEffect(
    () => () => {
      if (advanceRef.current) window.clearTimeout(advanceRef.current);
    },
    [],
  );

  const ensureCtx = (): AudioContext => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new Ctx();
    }
    return ctxRef.current;
  };

  const playInterval = useCallback((c: Cur) => {
    const ctx = ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    const low = midiToFreq(c.root);
    const high = midiToFreq(c.root + c.semis);
    if (c.dir === "harmonic") {
      playTimbre(ctx, low, 1.4, "piano", 0);
      playTimbre(ctx, high, 1.4, "piano", 0);
    } else if (c.dir === "ascending") {
      playTimbre(ctx, low, 0.7, "piano", 0);
      playTimbre(ctx, high, 0.95, "piano", 0.62);
    } else {
      playTimbre(ctx, high, 0.7, "piano", 0);
      playTimbre(ctx, low, 0.95, "piano", 0.62);
    }
  }, []);

  const next = useCallback(() => {
    const pool = enabled.length >= 2 ? enabled : DEFAULT_INTERVALS;
    const semis = pickRandom(pool, curRef.current?.semis);
    const dir: Direction = dirMode === "random" ? pickRandom(DIRECTIONS) : dirMode;
    const maxRoot = 72 - Math.max(...pool); // keep the top note at/below C5
    const root = 52 + Math.floor(Math.random() * Math.max(1, maxRoot - 52 + 1));
    const c = { root, semis, dir };
    curRef.current = c;
    answeredRef.current = false;
    setCur(c);
    setAnswered(null);
    playInterval(c);
  }, [enabled, dirMode, playInterval]);

  const start = useCallback(async () => {
    // Unlock/resume audio inside the tap gesture before scheduling any notes — required
    // on mobile (iOS Safari) where the context otherwise stays suspended and silent.
    await unlockAudio(ensureCtx());
    setScore({ correct: 0, total: 0, streak: 0, best: 0 });
    setRunning(true);
    runningRef.current = true;
    next();
  }, [next]);

  const stop = useCallback(() => {
    setRunning(false);
    runningRef.current = false;
    setCur(null);
    setAnswered(null);
    curRef.current = null;
    if (advanceRef.current) window.clearTimeout(advanceRef.current);
  }, []);

  const replay = useCallback(() => {
    if (curRef.current) playInterval(curRef.current);
  }, [playInterval]);

  const answer = useCallback(
    (semis: number) => {
      const c = curRef.current;
      if (!c || answeredRef.current) return;
      answeredRef.current = true;
      const correct = semis === c.semis;
      setAnswered({ picked: semis, correct });
      setScore((s) => {
        const streak = correct ? s.streak + 1 : 0;
        return { correct: s.correct + (correct ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak) };
      });
      setIStats((prev) => {
        const p = prev[c.semis] || { prompts: 0, correct: 0 };
        return { ...prev, [c.semis]: { prompts: p.prompts + 1, correct: p.correct + (correct ? 1 : 0) } };
      });
      advanceRef.current = window.setTimeout(
        () => {
          if (runningRef.current) next();
        },
        correct ? 850 : 1700,
      );
    },
    [next],
  );

  const toggle = (s: number) => {
    setEnabled((prev) => {
      if (prev.includes(s)) return prev.length <= 2 ? prev : prev.filter((x) => x !== s);
      return [...prev, s].sort((a, b) => a - b);
    });
  };

  const resetIStats = useCallback(() => {
    if (typeof window !== "undefined" && !window.confirm("Clear your interval stats?")) return;
    setIStats({});
  }, []);

  // Keyboard: R replays, digits 1-9 pick the Nth enabled interval.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!runningRef.current) return;
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        replay();
      } else if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < enabled.length) answer(enabled[idx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, answer, replay]);

  const answeredInterval = cur ? intervalBySemis(cur.semis) : null;
  const dirGlyph = cur ? (cur.dir === "ascending" ? "↗ ascending" : cur.dir === "descending" ? "↘ descending" : "⇊ harmonic") : "";
  const statMax = Math.max(1, ...Object.values(istats).map((v) => v.prompts));

  return (
    <>
      <div className="stage">
        <div className="prompt-label">{running ? "What interval is this?" : "Interval ear training"}</div>

        <div className="target-name">
          {!running ? (
            "—"
          ) : answered ? (
            <span style={{ color: answered.correct ? "var(--good)" : "var(--bad)" }}>{answeredInterval?.short}</span>
          ) : (
            <span style={{ color: "var(--muted)" }}>?</span>
          )}
        </div>
        <div className="target-sub">
          {!running
            ? "Press start — you'll hear two notes; name the interval between them."
            : answered
              ? `${answeredInterval?.name} · ${dirGlyph}`
              : dirGlyph}
        </div>

        <div className="statusline" style={{ minHeight: 22 }}>
          {answered ? (
            answered.correct ? (
              <span className="good">✓ Correct!</span>
            ) : (
              <span className="bad">
                ✗ That was {intervalBySemis(cur!.semis)?.name} — you picked {intervalBySemis(answered.picked)?.short}
              </span>
            )
          ) : (
            " "
          )}
        </div>

        {running && (
          <div className="answer-grid">
            {enabled.map((s) => {
              const iv = intervalBySemis(s)!;
              const isCorrect = answered && s === cur?.semis;
              const isWrongPick = answered && !answered.correct && s === answered.picked;
              return (
                <button
                  key={s}
                  className={"answer-btn" + (isCorrect ? " correct" : "") + (isWrongPick ? " wrong" : "")}
                  disabled={!!answered}
                  onClick={() => answer(s)}
                >
                  <b>{iv.short}</b>
                  <span>{iv.name}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="controls">
          <button className={running ? "" : "primary"} onClick={running ? stop : start}>
            {running ? "⏹ Stop" : "▶ Start"}
          </button>
          <button className="icon-btn" onClick={replay} disabled={!running} title="Hear it again">
            🔊 Replay
          </button>
        </div>
        <div className="scorebar">
          <span>
            Score{" "}
            <b>
              {score.correct}/{score.total}
            </b>
          </span>
          <span>
            Streak <b>{score.streak}</b>
          </span>
          <span>
            Best <b>{score.best}</b>
          </span>
        </div>
      </div>

      <details className="settings">
        <summary>Interval settings</summary>
        <div className="grid">
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Intervals to include (tap to toggle — at least two)</label>
            <div className="interval-toggle">
              {INTERVALS.map((iv) => (
                <button key={iv.semitones} className={enabled.includes(iv.semitones) ? "on" : ""} onClick={() => toggle(iv.semitones)} title={iv.name}>
                  {iv.short}
                </button>
              ))}
            </div>
          </div>
          <div className="field" style={{ gridColumn: "1/-1" }}>
            <label>Direction</label>
            <div className="seg">
              {(["ascending", "descending", "harmonic", "random"] as const).map((d) => (
                <button key={d} className={dirMode === d ? "on" : ""} onClick={() => setDirMode(d)}>
                  {d === "ascending" ? "↗ Ascending" : d === "descending" ? "↘ Descending" : d === "harmonic" ? "⇊ Harmonic" : "🎲 Random"}
                </button>
              ))}
            </div>
            <div className="hint">Ascending/descending play the notes in turn; harmonic plays them together (hardest).</div>
          </div>
        </div>
      </details>

      <details className="settings">
        <summary>Your interval progress</summary>
        <div className="stats-body">
          {Object.keys(istats).length === 0 ? (
            <div className="hint">No data yet — answer a few and your accuracy per interval will show here. Saved on this device only.</div>
          ) : (
            <>
              <div className="stat-section-title">Accuracy by interval</div>
              <div className="pc-bars">
                {INTERVALS.filter((iv) => istats[iv.semitones]?.prompts).map((iv) => {
                  const st = istats[iv.semitones];
                  const acc = st.correct / st.prompts;
                  const cls = acc >= 0.8 ? "good" : acc >= 0.5 ? "warn" : "bad";
                  return (
                    <div className="pc-bar" key={iv.semitones}>
                      <span className="pc-name">{iv.short}</span>
                      <div className="pc-track">
                        <div className={"pc-fill " + cls} style={{ width: acc * 100 + "%" }} />
                      </div>
                      <span className="pc-val">{Math.round(acc * 100)}%</span>
                      <span className="pc-count">{st.prompts}×</span>
                    </div>
                  );
                })}
              </div>
              <button className="reset-btn" onClick={resetIStats}>
                Reset interval stats
              </button>
            </>
          )}
        </div>
      </details>

      <div className="foot">
        Ear training — you hear two notes and name the interval. No mic needed. Everything runs and is saved on your device.
      </div>
    </>
  );
}
