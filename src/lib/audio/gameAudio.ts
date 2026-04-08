const MUSIC_VOLUME = 0.28;
const SFX_VOLUME = 0.55;

/**
 * Lightweight game audio: looping music + one-shot SFX. No Web Audio graph — uses HTMLAudioElement.
 * Autoplay-safe: retries after first user gesture if needed.
 */
export class GameAudioController {
  private music: HTMLAudioElement | null = null;
  private currentMusicSrc = "";
  private gestureUnlocked = false;

  constructor() {
    if (typeof window === "undefined") return;
    this.music = document.createElement("audio");
    this.music.preload = "auto";
    this.music.loop = true;
    this.music.volume = MUSIC_VOLUME;
    this.tryUnlockOnGesture();
  }

  private tryUnlockOnGesture() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      this.gestureUnlocked = true;
      if (this.music?.paused && this.currentMusicSrc) {
        void this.music.play().catch(() => {});
      }
    };
    window.addEventListener("click", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
  }

  /** Looping bed music; no-op if already playing this URL. */
  setMusic(src: string) {
    if (!this.music) return;
    if (src === this.currentMusicSrc && !this.music.paused) return;
    this.currentMusicSrc = src;
    this.music.src = src;
    this.music.loop = true;
    this.music.volume = MUSIC_VOLUME;
    void this.music.play().catch(() => {
      /* often blocked until gesture — tryUnlockOnGesture handles retry */
    });
  }

  stopMusic() {
    if (!this.music) return;
    this.music.pause();
    this.currentMusicSrc = "";
  }

  playSfx(src: string, volume = SFX_VOLUME) {
    if (typeof window === "undefined") return;
    try {
      const a = new Audio(src);
      a.volume = volume;
      void a.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

let instance: GameAudioController | null = null;

export function getGameAudio(): GameAudioController | null {
  if (typeof window === "undefined") return null;
  if (!instance) instance = new GameAudioController();
  return instance;
}
