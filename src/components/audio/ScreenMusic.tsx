"use client";

import { useEffect } from "react";
import { SOUNDS } from "@/config/gameSounds";
import { getGameAudio } from "@/lib/audio/gameAudio";

/** Plays the main campaign loop while mounted (home / play / lobby). */
export function ScreenMusic() {
  useEffect(() => {
    const a = getGameAudio();
    a?.setMusic(SOUNDS.musicTitle);
    return () => {
      a?.stopMusic();
    };
  }, []);

  return null;
}
