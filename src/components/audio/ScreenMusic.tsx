"use client";

import { useEffect } from "react";
import { SOUNDS } from "@/config/gameSounds";
import { getGameAudio } from "@/lib/audio/gameAudio";

type ScreenMusicProps = {
  /** Which loop to play while this screen is mounted. */
  variant: "title" | "lobby";
};

export function ScreenMusic({ variant }: ScreenMusicProps) {
  useEffect(() => {
    const a = getGameAudio();
    const src = variant === "lobby" ? SOUNDS.musicLobby : SOUNDS.musicTitle;
    a?.setMusic(src);
    return () => {
      a?.stopMusic();
    };
  }, [variant]);

  return null;
}
