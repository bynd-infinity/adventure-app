"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  CHIP_SAMPLE_RATE,
  defaultSfxParams,
  mergeSfxParams,
  NOTE_OPTIONS,
  renderSfx,
  renderTrackerLoop,
  sfxPresets,
  type ChipWaveform,
  type SfxParams,
  type TrackerStep,
} from "@/lib/audio/chip8";
import { downloadArrayBuffer, encodeFloatToWav8Mono } from "@/lib/audio/wavEncode";

type TabId = "sfx" | "music";

function playSamples(samples: Float32Array, sampleRate: number): void {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate }) as AudioContext;
  const buf = ctx.createBuffer(1, samples.length, sampleRate);
  buf.getChannelData(0).set(samples);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.onended = () => void ctx.close();
  void ctx.resume().then(() => src.start());
}

const STEPS = 16;

function defaultTrackerSteps(): TrackerStep[] {
  const pat: TrackerStep[] = new Array(STEPS).fill(null);
  const notes = [NOTE_OPTIONS[2], NOTE_OPTIONS[4], NOTE_OPTIONS[6], NOTE_OPTIONS[9]]; // C4 D4 E4 G4
  for (let i = 0; i < STEPS; i++) {
    pat[i] = notes[i % 4]!.freq;
  }
  return pat;
}

export function EightBitAudioLab() {
  const [tab, setTab] = useState<TabId>("sfx");
  const [sfx, setSfx] = useState<SfxParams>(() => defaultSfxParams());
  const [musicBpm, setMusicBpm] = useState(128);
  const [musicWave, setMusicWave] = useState<ChipWaveform>("square");
  const [musicDuty, setMusicDuty] = useState(0.5);
  const [musicLoops, setMusicLoops] = useState(2);
  const [trackerSteps, setTrackerSteps] = useState<TrackerStep[]>(() =>
    defaultTrackerSteps(),
  );
  const playingRef = useRef(false);

  const presetList = useMemo(() => sfxPresets(), []);

  const applyPreset = (name: string) => {
    const p = presetList[name];
    if (p) setSfx((prev) => mergeSfxParams(prev, p));
  };

  const previewSfx = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    const samples = renderSfx(sfx);
    playSamples(samples, CHIP_SAMPLE_RATE);
    window.setTimeout(() => {
      playingRef.current = false;
    }, sfx.durationMs + 50);
  }, [sfx]);

  const exportSfx = useCallback(() => {
    const samples = renderSfx(sfx);
    const wav = encodeFloatToWav8Mono(samples, CHIP_SAMPLE_RATE);
    downloadArrayBuffer(wav, "chip-sfx.wav");
  }, [sfx]);

  const previewMusic = useCallback(() => {
    if (playingRef.current) return;
    const loop = renderTrackerLoop(trackerSteps, musicBpm, musicWave, musicDuty);
    let samples = loop;
    for (let i = 1; i < musicLoops; i++) {
      const merged = new Float32Array(samples.length + loop.length);
      merged.set(samples);
      merged.set(loop, samples.length);
      samples = merged;
    }
    playingRef.current = true;
    playSamples(samples, CHIP_SAMPLE_RATE);
    window.setTimeout(
      () => {
        playingRef.current = false;
      },
      (1000 * samples.length) / CHIP_SAMPLE_RATE + 80,
    );
  }, [trackerSteps, musicBpm, musicWave, musicDuty, musicLoops]);

  const exportMusic = useCallback(() => {
    const loop = renderTrackerLoop(trackerSteps, musicBpm, musicWave, musicDuty);
    let samples = loop;
    for (let i = 1; i < musicLoops; i++) {
      const merged = new Float32Array(samples.length + loop.length);
      merged.set(samples);
      merged.set(loop, samples.length);
      samples = merged;
    }
    const wav = encodeFloatToWav8Mono(samples, CHIP_SAMPLE_RATE);
    downloadArrayBuffer(wav, "chip-loop.wav");
  }, [trackerSteps, musicBpm, musicWave, musicDuty, musicLoops]);

  const setStep = (index: number, freq: TrackerStep) => {
    setTrackerSteps((prev) => {
      const next = [...prev];
      next[index] = freq;
      return next;
    });
  };

  const stepSelectIndex = (step: TrackerStep) => {
    const i = NOTE_OPTIONS.findIndex((o) =>
      o.freq === null
        ? step === null
        : step !== null && Math.abs(o.freq - step) < 0.01,
    );
    return i >= 0 ? i : 0;
  };

  return (
    <div className="w-full max-w-4xl rounded-2xl border border-emerald-500/35 bg-zinc-950/90 p-5 text-left shadow-xl backdrop-blur-sm md:p-8">
      <h2 className="font-mono text-lg font-bold uppercase tracking-[0.2em] text-emerald-300/95">
        8-bit audio lab
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Prototype sound effects and short loops here, then export 8-bit mono WAV files for use
        under <code className="rounded bg-zinc-800 px-1 text-emerald-200/90">public/sounds</code>.
        Preview uses your browser; export matches the same synthesis.
      </p>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
        {(
          [
            ["sfx", "Sound effect"],
            ["music", "Music loop"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === id
                ? "bg-emerald-700/50 text-emerald-50 ring-1 ring-emerald-400/50"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sfx" ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Preset
              <select
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                onChange={(e) => {
                  if (e.target.value) applyPreset(e.target.value);
                }}
                defaultValue=""
              >
                <option value="">— Load preset —</option>
                {Object.keys(presetList).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Waveform
              <select
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                value={sfx.waveform}
                onChange={(e) =>
                  setSfx((p) => ({ ...p, waveform: e.target.value as ChipWaveform }))
                }
              >
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="saw">Saw</option>
                <option value="noise">Noise</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Slider
              label="Start frequency (Hz)"
              min={40}
              max={4000}
              step={1}
              value={sfx.freqStart}
              onChange={(v) => setSfx((p) => ({ ...p, freqStart: v }))}
            />
            <Slider
              label="End frequency (Hz) — sweep"
              min={40}
              max={4000}
              step={1}
              value={sfx.freqEnd}
              onChange={(v) => setSfx((p) => ({ ...p, freqEnd: v }))}
            />
            <Slider
              label="Duration (ms)"
              min={20}
              max={2000}
              step={10}
              value={sfx.durationMs}
              onChange={(v) => setSfx((p) => ({ ...p, durationMs: v }))}
            />
            <Slider
              label="Square duty"
              min={0.05}
              max={0.95}
              step={0.05}
              value={sfx.duty}
              onChange={(v) => setSfx((p) => ({ ...p, duty: v }))}
            />
            <Slider
              label="Attack"
              min={0}
              max={0.5}
              step={0.01}
              value={sfx.attack}
              onChange={(v) => setSfx((p) => ({ ...p, attack: v }))}
            />
            <Slider
              label="Decay"
              min={0}
              max={0.6}
              step={0.01}
              value={sfx.decay}
              onChange={(v) => setSfx((p) => ({ ...p, decay: v }))}
            />
            <Slider
              label="Sustain level"
              min={0}
              max={1}
              step={0.05}
              value={sfx.sustain}
              onChange={(v) => setSfx((p) => ({ ...p, sustain: v }))}
            />
            <Slider
              label="Release"
              min={0}
              max={0.6}
              step={0.01}
              value={sfx.release}
              onChange={(v) => setSfx((p) => ({ ...p, release: v }))}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={previewSfx}
              className="rounded-lg border border-emerald-600/60 bg-emerald-950/50 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={exportSfx}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Download WAV
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              BPM
              <input
                type="number"
                min={40}
                max={240}
                value={musicBpm}
                onChange={(e) => setMusicBpm(Number(e.target.value) || 120)}
                className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Waveform
              <select
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                value={musicWave}
                onChange={(e) =>
                  setMusicWave(e.target.value as ChipWaveform)
                }
              >
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
                <option value="saw">Saw</option>
                <option value="noise">Noise</option>
              </select>
            </label>
            <Slider
              label="Duty (square)"
              min={0.05}
              max={0.95}
              step={0.05}
              value={musicDuty}
              onChange={setMusicDuty}
            />
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Loop repeats (export)
              <input
                type="number"
                min={1}
                max={32}
                value={musicLoops}
                onChange={(e) => setMusicLoops(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>

          <p className="text-xs text-zinc-500">
            Sixteen steps at 16th-note resolution (one bar in 4/4). Choose pitch per step — monophonic
            chip lead.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
            {trackerSteps.map((step, i) => (
              <label
                key={i}
                className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2"
              >
                <span className="text-[10px] font-mono uppercase text-zinc-500">
                  {i + 1}
                </span>
                <select
                  className="w-full rounded border border-zinc-700 bg-zinc-950 py-1 text-[11px] text-zinc-100"
                  value={stepSelectIndex(step)}
                  onChange={(e) => {
                    const opt = NOTE_OPTIONS[Number(e.target.value)];
                    if (opt) setStep(i, opt.freq);
                  }}
                >
                  {NOTE_OPTIONS.map((o, j) => (
                    <option key={o.label} value={j}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={previewMusic}
              className="rounded-lg border border-emerald-600/60 bg-emerald-950/50 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/50"
            >
              Preview loop
            </button>
            <button
              type="button"
              onClick={exportMusic}
              className="rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              Download WAV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-500">
      <span>
        {label}{" "}
        <span className="font-mono text-zinc-400">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500"
      />
    </label>
  );
}
