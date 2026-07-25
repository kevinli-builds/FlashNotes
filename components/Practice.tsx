"use client";

import { useState } from "react";
import Trainer from "./Trainer";
import IntervalTrainer from "./IntervalTrainer";

type Tab = "pitch" | "interval";

export default function Practice() {
  const [tab, setTab] = useState<Tab>("pitch");

  return (
    <div className="wrap">
      <header>
        <h1>
          MusicFlash<span className="dot">.</span>
        </h1>
        <div className="tag">musical flashcards · train your ear and your instrument</div>
      </header>

      <div className="tabbar">
        <button className={tab === "pitch" ? "on" : ""} onClick={() => setTab("pitch")}>
          🎯 Match a pitch
        </button>
        <button className={tab === "interval" ? "on" : ""} onClick={() => setTab("interval")}>
          👂 Name the interval
        </button>
      </div>

      {tab === "pitch" ? <Trainer /> : <IntervalTrainer />}
    </div>
  );
}
