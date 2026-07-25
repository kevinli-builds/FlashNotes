# MusicFlash

> Repo/package name is `FlashNotes`; the app's display name is **MusicFlash**.

Musical flashcards for ear training and instrument practice. Two ways to train:
**Match a pitch** (the app listens through your mic and advances when you play/sing the
right note) and **Name the interval** (hear two notes, identify the interval by ear).
Everything runs in the browser; audio never leaves your device.

## Features
- **Match a pitch** — *Play it* (a note appears, play it on your instrument) and *Sing it*
  (a reference tone plays, match it with your voice).
- **Name the interval** — an ear-training quiz: hear an interval (ascending, descending, or
  harmonic) and pick its name; tracks per-interval accuracy.
- **Practice** single notes, **chords**, **chord progressions**, or **melodies** — famous
  public-domain themes (Ode to Joy, Twinkle, Joy to the World…), transposable to any key.
- **Import a song or clip** — drop in an audio file; it detects the notes locally (nothing
  uploaded) and turns them into a practice run. Monophonic, so it works on a solo vocal,
  a hum/whistle, or an isolated stem — with a "Fine" mode for fast runs.
- **Ranges** — pick a **voice type** (bass→soprano) when singing or an **instrument**
  (piano, guitar, violin, clarinet, oboe, trumpet, sax…) when playing; the instrument also
  sets the **timbre** of the prompt tone, synthesized in the browser.
- **Show the note** as a letter, solfège, staff notation, or hidden (pure ear training).
- **Smart tuner** — a nonlinear needle with note-name landmarks shows how far off you are
  from several semitones out down to a few cents, with a live distance readout.
- **Progress** — per-note accuracy, toughest notes, and a daily history, saved on-device.

Pitch detection is monophonic — one clear note at a time (chords are arpeggiated).

## Develop
```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest — pure music + pitch-detection logic
npm run build    # production build + typecheck
```

Next.js 15 + React 19 + TypeScript. No backend, no env vars. Deploys to Vercel with zero
config (auto-detected).

See `OPUS_BRIEF.md` for the roadmap.
