// Practice statistics — pure reducers over a serializable Stats object.
// No DOM / no localStorage here (that lives in the component) so this stays
// unit-testable in the node env. Tracks results per pitch class (0-11), a
// rolling per-day history, total practice time, and best streak.

export interface NoteStat {
  prompts: number; // times this pitch class was asked
  hits: number; // times it was landed
  skips: number; // times it was skipped / given up on
  hitMs: number; // summed time-to-hit (for averages)
  bestMs: number | null; // fastest hit
}

export interface DaySession {
  date: string; // YYYY-MM-DD
  prompts: number;
  hits: number;
}

export interface Stats {
  v: number;
  byPc: NoteStat[]; // length 12
  totalMs: number; // total practice time
  bestStreak: number;
  sessions: DaySession[]; // recent days, oldest first
}

export const STATS_VERSION = 1;
const MAX_DAYS = 60;

const num = (x: unknown): number => (typeof x === "number" && isFinite(x) ? x : 0);

export function emptyNote(): NoteStat {
  return { prompts: 0, hits: 0, skips: 0, hitMs: 0, bestMs: null };
}

export function emptyStats(): Stats {
  return { v: STATS_VERSION, byPc: Array.from({ length: 12 }, emptyNote), totalMs: 0, bestStreak: 0, sessions: [] };
}

/** Defensively coerce anything (e.g. parsed localStorage) into a valid Stats. */
export function coerceStats(raw: unknown): Stats {
  const s = emptyStats();
  if (!raw || typeof raw !== "object") return s;
  const r = raw as Partial<Stats>;
  if (Array.isArray(r.byPc)) {
    for (let i = 0; i < 12; i++) {
      const n = r.byPc[i];
      if (n && typeof n === "object") {
        s.byPc[i] = {
          prompts: num((n as NoteStat).prompts),
          hits: num((n as NoteStat).hits),
          skips: num((n as NoteStat).skips),
          hitMs: num((n as NoteStat).hitMs),
          bestMs: typeof (n as NoteStat).bestMs === "number" ? (n as NoteStat).bestMs : null,
        };
      }
    }
  }
  s.totalMs = num(r.totalMs);
  s.bestStreak = num(r.bestStreak);
  if (Array.isArray(r.sessions)) {
    s.sessions = r.sessions
      .filter((d) => d && typeof (d as DaySession).date === "string")
      .slice(-MAX_DAYS)
      .map((d) => ({ date: (d as DaySession).date, prompts: num((d as DaySession).prompts), hits: num((d as DaySession).hits) }));
  }
  return s;
}

function clone(s: Stats): Stats {
  return {
    v: s.v,
    totalMs: s.totalMs,
    bestStreak: s.bestStreak,
    byPc: s.byPc.map((n) => ({ ...n })),
    sessions: s.sessions.map((d) => ({ ...d })),
  };
}

/** Record one resolved prompt for pitch class `pc`. Returns a new Stats. */
export function recordResult(stats: Stats, pc: number, hit: boolean, ms: number, date: string): Stats {
  const next = clone(stats);
  const n = next.byPc[((pc % 12) + 12) % 12];
  n.prompts++;
  if (hit) {
    n.hits++;
    n.hitMs += Math.max(0, ms);
    if (n.bestMs === null || ms < n.bestMs) n.bestMs = Math.max(0, ms);
  } else {
    n.skips++;
  }
  let day = next.sessions[next.sessions.length - 1];
  if (!day || day.date !== date) {
    day = { date, prompts: 0, hits: 0 };
    next.sessions.push(day);
    if (next.sessions.length > MAX_DAYS) next.sessions.shift();
  }
  day.prompts++;
  if (hit) day.hits++;
  return next;
}

/** Raise the recorded best streak if `streak` beats it. Returns a new Stats. */
export function withBestStreak(stats: Stats, streak: number): Stats {
  if (streak <= stats.bestStreak) return stats;
  const next = clone(stats);
  next.bestStreak = streak;
  return next;
}

/** Add elapsed practice time. Returns a new Stats. */
export function addPracticeMs(stats: Stats, ms: number): Stats {
  if (ms <= 0) return stats;
  const next = clone(stats);
  next.totalMs += ms;
  return next;
}

export const accuracy = (n: NoteStat): number => (n.prompts ? n.hits / n.prompts : 0);
export const avgHitMs = (n: NoteStat): number => (n.hits ? n.hitMs / n.hits : 0);

export function totals(stats: Stats): { prompts: number; hits: number; skips: number; accuracy: number } {
  let prompts = 0;
  let hits = 0;
  let skips = 0;
  for (const n of stats.byPc) {
    prompts += n.prompts;
    hits += n.hits;
    skips += n.skips;
  }
  return { prompts, hits, skips, accuracy: prompts ? hits / prompts : 0 };
}

/** Pitch classes ordered hardest-first (lowest accuracy, tie-broken by slower time). */
export function hardestPcs(stats: Stats, minPrompts = 3): number[] {
  return stats.byPc
    .map((n, pc) => ({ pc, n }))
    .filter((x) => x.n.prompts >= minPrompts)
    .sort((a, b) => accuracy(a.n) - accuracy(b.n) || avgHitMs(b.n) - avgHitMs(a.n))
    .map((x) => x.pc);
}
