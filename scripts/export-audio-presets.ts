/**
 * Writes every audio-lab preset to public/sounds/*.wav (same synthesis as the browser lab).
 * Run from repo root: npx tsx scripts/export-audio-presets.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  MUSIC_LAB_PRESETS,
  SFX_LAB_PRESETS,
} from "../src/config/audioLabPresets";
import {
  CHIP_SAMPLE_RATE,
  renderSfx,
  renderTrackerLoop,
} from "../src/lib/audio/chip8";
import { encodeFloatToWav8Mono } from "../src/lib/audio/wavEncode";

function concatLoops(loop: Float32Array, times: number): Float32Array {
  let samples = loop;
  for (let i = 1; i < times; i++) {
    const merged = new Float32Array(samples.length + loop.length);
    merged.set(samples);
    merged.set(loop, samples.length);
    samples = merged;
  }
  return samples;
}

const root = process.cwd();
const outDir = join(root, "public", "sounds");

mkdirSync(outDir, { recursive: true });

let count = 0;

for (const p of SFX_LAB_PRESETS) {
  const samples = renderSfx(p.params);
  const wav = encodeFloatToWav8Mono(samples, CHIP_SAMPLE_RATE);
  writeFileSync(join(outDir, p.exportFile), Buffer.from(wav));
  count += 1;
}

for (const p of MUSIC_LAB_PRESETS) {
  const loop = renderTrackerLoop(p.steps, p.bpm, p.waveform, p.duty);
  const samples = concatLoops(loop, p.musicLoops);
  const wav = encodeFloatToWav8Mono(samples, CHIP_SAMPLE_RATE);
  writeFileSync(join(outDir, p.exportFile), Buffer.from(wav));
  count += 1;
}

console.log(`Wrote ${count} WAV files to ${outDir}`);
