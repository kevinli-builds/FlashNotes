# FlashNotes

Musical flashcards for ear training and instrument practice. A note is prompted and the
app **listens through your microphone**, advancing when it hears you play or sing the
right pitch — flashcards, but for musical skills. Everything runs in the browser; audio
never leaves your device.

## Features
- **Two modes** — *Play it* (a note appears, play it on your instrument) and *Sing it*
  (a reference tone plays, match it with your voice).
- **Show the note** as a letter, solfège, staff notation, or hidden (pure ear training).
- **Note pool** — range sliders, instrument presets (voice, guitar, bass, piano, violin,
  flute), and scales (chromatic, naturals, major, minor, pentatonic, blues).
- **Live feedback** — a tuner needle shows how flat/sharp you are; adjustable tolerance
  and hold-to-confirm; streak/accuracy tracking.

Pitch detection is monophonic — one clear note at a time.

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
