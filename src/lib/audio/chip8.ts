/**
 * Lightweight 8-bit–style synthesis for preview + WAV export (no Web Audio required).
 */

export const CHIP_SAMPLE_RATE = 22050;

export type ChipWaveform = "square" | "triangle" | "saw" | "noise";

export type SfxParams = {
  waveform: ChipWaveform;
  /** Hz */
  freqStart: number;
  /** Hz at end (linear sweep); same as start for no sweep */
  freqEnd: number;
  /** milliseconds */
  durationMs: number;
  /** 0..1 attack portion of total duration */
  attack: number;
  /** 0..1 decay portion after attack */
  decay: number;
  /** 0..1 sustain level */
  sustain: number;
  /** 0..1 release portion at end */
  release: number;
  /** Square duty cycle 0.05..0.95 */
  duty: number;
};

const TAU = Math.PI * 2;

export function noteToFreq(note: string): number {
  const m = note.trim().match(/^([A-G])(#|b)?(\d+)$/i);
  if (!m) return 440;
  const [, letter, acc, octStr] = m;
  const oct = parseInt(octStr!, 10);
  const semitoneFromC: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let semi = semitoneFromC[letter!.toUpperCase()] ?? 0;
  if (acc === "#") semi += 1;
  if (acc === "b") semi -= 1;
  const midi = (oct + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function oscSample(
  waveform: ChipWaveform,
  phase: number,
  duty: number,
  noiseState: { seed: number },
): number {
  const p = phase % 1;
  switch (waveform) {
    case "square":
      return p < duty ? 1 : -1;
    case "triangle":
      return p < 0.5 ? -1 + p * 4 : 3 - p * 4;
    case "saw":
      return p * 2 - 1;
    case "noise": {
      let s = noiseState.seed;
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      noiseState.seed = s | 0;
      return ((s & 0xffff) / 0x8000) - 1;
    }
    default:
      return Math.sin(p * TAU);
  }
}

export function renderSfx(params: SfxParams): Float32Array {
  const sr = CHIP_SAMPLE_RATE;
  const totalSamples = Math.max(1, Math.floor((params.durationMs / 1000) * sr));
  const out = new Float32Array(totalSamples);
  let aLen = Math.floor(totalSamples * params.attack);
  let dLen = Math.floor(totalSamples * params.decay);
  let rLen = Math.floor(totalSamples * params.release);
  if (aLen + dLen + rLen > totalSamples) {
    const scale = totalSamples / (aLen + dLen + rLen);
    aLen = Math.floor(aLen * scale);
    dLen = Math.floor(dLen * scale);
    rLen = Math.max(0, totalSamples - aLen - dLen);
  }
  const sustainLen = Math.max(0, totalSamples - aLen - dLen - rLen);
  let phase = 0;
  const noiseState = { seed: 0xace1 };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const f =
      params.freqStart + (params.freqEnd - params.freqStart) * t;
    phase += f / sr;
    if (phase > 1e6) phase %= 1;

    let env = 0;
    if (i < aLen && aLen > 0) {
      env = i / aLen;
    } else if (i < aLen + dLen && dLen > 0) {
      const u = (i - aLen) / dLen;
      env = 1 - u * (1 - params.sustain);
    } else if (i < aLen + dLen + sustainLen) {
      env = params.sustain;
    } else if (rLen > 0) {
      const u = (i - (aLen + dLen + sustainLen)) / rLen;
      env = params.sustain * (1 - u);
    }

    const raw = oscSample(
      params.waveform,
      phase,
      params.duty,
      noiseState,
    );
    out[i] = raw * env * 0.85;
  }

  return out;
}

/** One tracker step: frequency Hz or null for rest. */
export type TrackerStep = number | null;

export function renderTrackerLoop(
  steps: TrackerStep[],
  bpm: number,
  waveform: ChipWaveform,
  duty: number,
): Float32Array {
  const sr = CHIP_SAMPLE_RATE;
  const stepSec = (60 / bpm) / 4;
  const stepSamples = Math.max(1, Math.floor(stepSec * sr));
  const fadeIn = Math.min(32, Math.floor(stepSamples * 0.02));
  const fadeOut = Math.min(64, Math.floor(stepSamples * 0.04));
  const chunks: Float32Array[] = [];

  for (const step of steps) {
    const buf = new Float32Array(stepSamples);
    if (step == null || step <= 0) {
      chunks.push(buf);
      continue;
    }
    let phase = 0;
    const noiseState = { seed: 0x600d };
    for (let i = 0; i < stepSamples; i++) {
      phase += step / sr;
      if (phase > 1e6) phase %= 1;
      let env = 1;
      if (i < fadeIn) env = i / fadeIn;
      const ri = stepSamples - 1 - i;
      if (ri < fadeOut) env *= ri / fadeOut;
      const raw = oscSample(waveform, phase, duty, noiseState);
      buf[i] = raw * env * 0.7;
    }
    chunks.push(buf);
  }

  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export const NOTE_OPTIONS: { label: string; freq: number | null }[] = [
  { label: "— Rest —", freq: null },
  { label: "C4", freq: noteToFreq("C4") },
  { label: "C#4", freq: noteToFreq("C#4") },
  { label: "D4", freq: noteToFreq("D4") },
  { label: "D#4", freq: noteToFreq("D#4") },
  { label: "E4", freq: noteToFreq("E4") },
  { label: "F4", freq: noteToFreq("F4") },
  { label: "F#4", freq: noteToFreq("F#4") },
  { label: "G4", freq: noteToFreq("G4") },
  { label: "G#4", freq: noteToFreq("G#4") },
  { label: "A4", freq: noteToFreq("A4") },
  { label: "A#4", freq: noteToFreq("A#4") },
  { label: "B4", freq: noteToFreq("B4") },
  { label: "C5", freq: noteToFreq("C5") },
  { label: "D5", freq: noteToFreq("D5") },
  { label: "E5", freq: noteToFreq("E5") },
  { label: "G3", freq: noteToFreq("G3") },
  { label: "A3", freq: noteToFreq("A3") },
];

export function sfxPresets(): Record<string, Partial<SfxParams>> {
  return {
    Blip: {
      waveform: "square",
      freqStart: 880,
      freqEnd: 1320,
      durationMs: 80,
      attack: 0.05,
      decay: 0.35,
      sustain: 0.2,
      release: 0.4,
      duty: 0.5,
    },
    Coin: {
      waveform: "square",
      freqStart: 988,
      freqEnd: 1318,
      durationMs: 160,
      attack: 0.02,
      decay: 0.2,
      sustain: 0.5,
      release: 0.5,
      duty: 0.5,
    },
    Hit: {
      waveform: "triangle",
      freqStart: 220,
      freqEnd: 55,
      durationMs: 220,
      attack: 0.01,
      decay: 0.5,
      sustain: 0.1,
      release: 0.35,
      duty: 0.5,
    },
    Laser: {
      waveform: "saw",
      freqStart: 2400,
      freqEnd: 200,
      durationMs: 280,
      attack: 0.02,
      decay: 0.4,
      sustain: 0.15,
      release: 0.35,
      duty: 0.5,
    },
    NoiseBurst: {
      waveform: "noise",
      freqStart: 400,
      freqEnd: 400,
      durationMs: 120,
      attack: 0.05,
      decay: 0.45,
      sustain: 0.2,
      release: 0.25,
      duty: 0.5,
    },
  };
}

export function defaultSfxParams(): SfxParams {
  return {
    waveform: "square",
    freqStart: 440,
    freqEnd: 440,
    durationMs: 200,
    attack: 0.05,
    decay: 0.15,
    sustain: 0.6,
    release: 0.25,
    duty: 0.5,
  };
}

export function mergeSfxParams(
  base: SfxParams,
  partial: Partial<SfxParams>,
): SfxParams {
  return { ...base, ...partial };
}
