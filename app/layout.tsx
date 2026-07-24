import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlashNotes — musical flashcards",
  description:
    "Ear-training and instrument-practice flashcards that listen through your mic. Random notes, scales, chords, and famous melodies.",
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
