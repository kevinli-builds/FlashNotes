import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MusicFlash — musical flashcards",
  description:
    "Ear-training and instrument-practice flashcards. Match pitches by mic, name intervals by ear, practice chords, scales, and melodies — or import your own clip.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
