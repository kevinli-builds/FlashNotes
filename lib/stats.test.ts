import { describe, it, expect } from "vitest";
import {
  emptyStats,
  coerceStats,
  recordResult,
  withBestStreak,
  addPracticeMs,
  accuracy,
  avgHitMs,
  totals,
  hardestPcs,
  STATS_VERSION,
} from "./stats";

const D = "2026-07-24";

describe("recordResult", () => {
  it("records hits with time and skips separately", () => {
    let s = emptyStats();
    s = recordResult(s, 0, true, 500, D);
    s = recordResult(s, 0, true, 300, D);
    s = recordResult(s, 0, false, 0, D);
    const c = s.byPc[0];
    expect(c.prompts).toBe(3);
    expect(c.hits).toBe(2);
    expect(c.skips).toBe(1);
    expect(c.bestMs).toBe(300);
    expect(accuracy(c)).toBeCloseTo(2 / 3);
    expect(avgHitMs(c)).toBe(400);
  });

  it("is immutable — the input is untouched", () => {
    const s0 = emptyStats();
    const s1 = recordResult(s0, 5, true, 200, D);
    expect(s0.byPc[5].prompts).toBe(0);
    expect(s1.byPc[5].prompts).toBe(1);
  });

  it("wraps out-of-range pitch classes", () => {
    let s = emptyStats();
    s = recordResult(s, 12, true, 100, D); // -> pc 0
    s = recordResult(s, -1, true, 100, D); // -> pc 11
    expect(s.byPc[0].hits).toBe(1);
    expect(s.byPc[11].hits).toBe(1);
  });

  it("buckets prompts by calendar day", () => {
    let s = emptyStats();
    s = recordResult(s, 0, true, 100, "2026-07-23");
    s = recordResult(s, 2, false, 0, "2026-07-24");
    s = recordResult(s, 4, true, 100, "2026-07-24");
    expect(s.sessions.length).toBe(2);
    expect(s.sessions[1]).toMatchObject({ date: "2026-07-24", prompts: 2, hits: 1 });
  });
});

describe("totals + streaks + time", () => {
  it("aggregates across pitch classes", () => {
    let s = emptyStats();
    s = recordResult(s, 0, true, 100, D);
    s = recordResult(s, 7, false, 0, D);
    const t = totals(s);
    expect(t.prompts).toBe(2);
    expect(t.hits).toBe(1);
    expect(t.skips).toBe(1);
    expect(t.accuracy).toBe(0.5);
  });

  it("raises best streak only when beaten", () => {
    let s = emptyStats();
    s = withBestStreak(s, 5);
    expect(s.bestStreak).toBe(5);
    s = withBestStreak(s, 3);
    expect(s.bestStreak).toBe(5);
    s = withBestStreak(s, 8);
    expect(s.bestStreak).toBe(8);
  });

  it("accumulates practice time and ignores non-positive", () => {
    let s = emptyStats();
    s = addPracticeMs(s, 1000);
    s = addPracticeMs(s, -5);
    expect(s.totalMs).toBe(1000);
  });
});

describe("hardestPcs", () => {
  it("orders by accuracy ascending, needs minimum prompts", () => {
    let s = emptyStats();
    // pc 0: 3/3 easy
    for (let i = 0; i < 3; i++) s = recordResult(s, 0, true, 100, D);
    // pc 2: 1/4 hard
    s = recordResult(s, 2, true, 100, D);
    for (let i = 0; i < 3; i++) s = recordResult(s, 2, false, 0, D);
    // pc 5: only 1 prompt -> excluded by minPrompts
    s = recordResult(s, 5, false, 0, D);
    const order = hardestPcs(s, 3);
    expect(order[0]).toBe(2); // hardest first
    expect(order).not.toContain(5); // below threshold
  });
});

describe("coerceStats", () => {
  it("returns empty for junk", () => {
    expect(coerceStats(null).byPc.length).toBe(12);
    expect(coerceStats("nope").v).toBe(STATS_VERSION);
    expect(coerceStats(42).sessions).toEqual([]);
  });

  it("round-trips a real stats object through JSON", () => {
    let s = emptyStats();
    s = recordResult(s, 3, true, 250, D);
    s = withBestStreak(s, 4);
    const back = coerceStats(JSON.parse(JSON.stringify(s)));
    expect(back.byPc[3].hits).toBe(1);
    expect(back.byPc[3].bestMs).toBe(250);
    expect(back.bestStreak).toBe(4);
    expect(back.sessions[0].date).toBe(D);
  });

  it("repairs a partial/corrupt object", () => {
    const back = coerceStats({ byPc: [{ prompts: "x", hits: 2 }], sessions: [{ nope: 1 }] });
    expect(back.byPc[0].prompts).toBe(0); // bad value zeroed
    expect(back.byPc[0].hits).toBe(2);
    expect(back.sessions).toEqual([]); // entry without a date dropped
  });
});
