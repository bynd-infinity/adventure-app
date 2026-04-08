"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  MUSIC_LAB_PRESETS,
  MUSIC_PRESETS_BY_ID,
  musicPresetToLayers,
  SFX_LAB_PRESETS,
  SFX_PRESETS_BY_ID,
} from "@/config/audioLabPresets";
import {
  CHIP_SAMPLE_RATE,
  NOTE_OPTIONS,
  renderMultiTrackerLoop,
  renderSfx,
  type ChipWaveform,
  type SfxParams,
  type TrackerLayer,
  type TrackerStep,
} from "@/lib/audio/chip8";
import { downloadArrayBuffer, encodeFloatToWav8Mono } from "@/lib/audio/wavEncode";

type TabId = "sfx" | "music";

const SFX_CATEGORY_ORDER = ["UI", "Exploration", "Combat", "Items"] as const;

function playSamples(samples: Float32Array, sampleRate: number): void {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const notes = [NOTE_OPTIONS[2], NOTE_OPTIONS[4], NOTE_OPTIONS[6], NOTE_OPTIONS[9]];
  for (let i = 0; i < STEPS; i++) {
    pat[i] = notes[i % 4]!.freq;
  }
  return pat;
}

function defaultTrackerLayers(): TrackerLayer[] {
  const s = defaultTrackerSteps();
  return [
    { steps: [...s], waveform: "square", duty: 0.5, gain: 0.55 },
    {
      steps: new Array(STEPS).fill(null),
      waveform: "triangle",
      duty: 0.5,
      gain: 0.42,
    },
  ];
}

export function EightBitAudioLab() {
  const [tab, setTab] = useState<TabId>("sfx");
  const [sfx, setSfx] = useState<SfxParams>(() =>
    SFX_PRESETS_BY_ID["ui-confirm"]!.params,
  );
  const [sfxPresetId, setSfxPresetId] = useState("ui-confirm");
  const [musicBpm, setMusicBpm] = useState(128);
  const [musicLoops, setMusicLoops] = useState(2);
  const [musicPresetId, setMusicPresetId] = useState("");
  const [trackerLayers, setTrackerLayers] = useState<TrackerLayer[]>(() =>
    defaultTrackerLayers(),
  );
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const playingRef = useRef(false);

  const sfxByCategory = useMemo(() => {
    const m = new Map<string, typeof SFX_LAB_PRESETS>();
    for (const p of SFX_LAB_PRESETS) {
      const list = m.get(p.category) ?? [];
      list.push(p);
      m.set(p.category, list);
    }
    return m;
  }, []);

  const musicLoopPresets = useMemo(
    () => MUSIC_LAB_PRESETS.filter((p) => p.id.startsWith("music-")),
    [],
  );
  const ambientPresets = useMemo(
    () => MUSIC_LAB_PRESETS.filter((p) => p.id.startsWith("ambient-")),
    [],
  );

  const sfxDownloadName =
    sfxPresetId && SFX_PRESETS_BY_ID[sfxPresetId]
      ? SFX_PRESETS_BY_ID[sfxPresetId].exportFile
      : "chip-sfx.wav";

  const musicDownloadName =
    musicPresetId && MUSIC_PRESETS_BY_ID[musicPresetId]
      ? MUSIC_PRESETS_BY_ID[musicPresetId].exportFile
      : "chip-loop.wav";

  const applySfxPreset = (id: string) => {
    const preset = SFX_PRESETS_BY_ID[id];
    if (!preset) return;
    setSfxPresetId(id);
    setSfx(preset.params);
  };

  const touchSfxCustom = () => setSfxPresetId("");

  const applyMusicPreset = useCallback((id: string) => {
    const preset = MUSIC_PRESETS_BY_ID[id];
    if (!preset) return;
    setMusicPresetId(id);
    setMusicBpm(preset.bpm);
    setMusicLoops(preset.musicLoops);
    setTrackerLayers(
      musicPresetToLayers(preset).map((L) => ({
        steps: [...L.steps],
        waveform: L.waveform,
        duty: L.duty,
        gain: L.gain,
      })),
    );
    setActiveLayerIndex(0);
  }, []);

  const touchMusicCustom = () => setMusicPresetId("");

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
    downloadArrayBuffer(wav, sfxDownloadName);
  }, [sfx, sfxDownloadName]);

  const previewMusic = useCallback(() => {
    if (playingRef.current) return;
    const loop = renderMultiTrackerLoop(trackerLayers, musicBpm);
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
  }, [trackerLayers, musicBpm, musicLoops]);

  const exportMusic = useCallback(() => {
    const loop = renderMultiTrackerLoop(trackerLayers, musicBpm);
    let samples = loop;
    for (let i = 1; i < musicLoops; i++) {
      const merged = new Float32Array(samples.length + loop.length);
      merged.set(samples);
      merged.set(loop, samples.length);
      samples = merged;
    }
    const wav = encodeFloatToWav8Mono(samples, CHIP_SAMPLE_RATE);
    downloadArrayBuffer(wav, musicDownloadName);
  }, [trackerLayers, musicBpm, musicLoops, musicDownloadName]);

  const activeLayer = trackerLayers[activeLayerIndex];

  const setLayerStep = (layerIdx: number, stepIdx: number, freq: TrackerStep) => {
    touchMusicCustom();
    setTrackerLayers((prev) =>
      prev.map((L, li) => {
        if (li !== layerIdx) return L;
        const steps = [...L.steps];
        steps[stepIdx] = freq;
        return { ...L, steps };
      }),
    );
  };

  const updateActiveLayer = (patch: Partial<TrackerLayer>) => {
    touchMusicCustom();
    setTrackerLayers((prev) =>
      prev.map((L, i) => (i === activeLayerIndex ? { ...L, ...patch } : L)),
    );
  };

  const addLayer = () => {
    touchMusicCustom();
    if (trackerLayers.length >= 4) return;
    const newIdx = trackerLayers.length;
    setTrackerLayers((prev) => [
      ...prev,
      {
        steps: new Array(STEPS).fill(null),
        waveform: "triangle",
        duty: 0.5,
        gain: 0.35,
      },
    ]);
    setActiveLayerIndex(newIdx);
  };

  const removeLayer = () => {
    if (trackerLayers.length <= 1) return;
    touchMusicCustom();
    const next = trackerLayers.filter((_, i) => i !== activeLayerIndex);
    setTrackerLayers(next);
    setActiveLayerIndex((j) => Math.min(j, next.length - 1));
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
        Load a preset for each game sound or loop, tweak if you like, then export 8-bit mono WAV into{" "}
        <code className="rounded bg-zinc-800 px-1 text-emerald-200/90">public/sounds</code>. Download
        uses the filename shown for the selected preset; custom tweaks save as{" "}
        <code className="text-zinc-500">chip-sfx.wav</code> /{" "}
        <code className="text-zinc-500">chip-loop.wav</code>.
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
            <label className="flex min-w-[min(100%,20rem)] flex-col gap-1 text-xs text-zinc-500">
              Preset → <span className="font-mono text-[10px] text-emerald-600/90">{sfxDownloadName}</span>
              <select
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                value={sfxPresetId}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) applySfxPreset(v);
                  else touchSfxCustom();
                }}
              >
                <option value="">— Custom (unnamed) —</option>
                {SFX_CATEGORY_ORDER.map((cat) => {
                  const list = sfxByCategory.get(cat);
                  if (!list?.length) return null;
                  return (
                    <optgroup key={cat} label={cat}>
                      {list.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Waveform
              <select
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                value={sfx.waveform}
                onChange={(e) => {
                  touchSfxCustom();
                  setSfx((p) => ({ ...p, waveform: e.target.value as ChipWaveform }));
                }}
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
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, freqStart: v }));
              }}
            />
            <Slider
              label="End frequency (Hz) — sweep"
              min={40}
              max={4000}
              step={1}
              value={sfx.freqEnd}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, freqEnd: v }));
              }}
            />
            <Slider
              label="Duration (ms)"
              min={20}
              max={2000}
              step={10}
              value={sfx.durationMs}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, durationMs: v }));
              }}
            />
            <Slider
              label="Square duty"
              min={0.05}
              max={0.95}
              step={0.05}
              value={sfx.duty}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, duty: v }));
              }}
            />
            <Slider
              label="Attack"
              min={0}
              max={0.5}
              step={0.01}
              value={sfx.attack}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, attack: v }));
              }}
            />
            <Slider
              label="Decay"
              min={0}
              max={0.6}
              step={0.01}
              value={sfx.decay}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, decay: v }));
              }}
            />
            <Slider
              label="Sustain level"
              min={0}
              max={1}
              step={0.05}
              value={sfx.sustain}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, sustain: v }));
              }}
            />
            <Slider
              label="Release"
              min={0}
              max={0.6}
              step={0.01}
              value={sfx.release}
              onChange={(v) => {
                touchSfxCustom();
                setSfx((p) => ({ ...p, release: v }));
              }}
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
              Download {sfxDownloadName}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          <label className="flex min-w-[min(100%,22rem)] flex-col gap-1 text-xs text-zinc-500">
            Preset → <span className="font-mono text-[10px] text-emerald-600/90">{musicDownloadName}</span>
            <select
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              value={musicPresetId}
              onChange={(e) => {
                const v = e.target.value;
                if (v) applyMusicPreset(v);
                else {
                  setMusicPresetId("");
                }
              }}
            >
              <option value="">— Custom pattern —</option>
              <optgroup label="Music loops">
                {musicLoopPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Room ambient">
                {ambientPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <p className="text-xs leading-relaxed text-zinc-500">
            Stack up to <strong className="text-zinc-400">4 layers</strong> (bass + lead + noise, etc.). Each
            layer has its own waveform, duty, mix <strong className="text-zinc-400">gain</strong>, and 16
            steps. All layers share BPM and are summed with soft clipping — export matches preview.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Layer
            </span>
            {trackerLayers.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveLayerIndex(i)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  i === activeLayerIndex
                    ? "bg-emerald-800/60 text-emerald-100 ring-1 ring-emerald-500/50"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={addLayer}
              disabled={trackerLayers.length >= 4}
              className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              + Layer
            </button>
            <button
              type="button"
              onClick={removeLayer}
              disabled={trackerLayers.length <= 1}
              className="rounded-md border border-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
            >
              Remove
            </button>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              BPM
              <input
                type="number"
                min={40}
                max={240}
                value={musicBpm}
                onChange={(e) => {
                  touchMusicCustom();
                  setMusicBpm(Number(e.target.value) || 120);
                }}
                className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Waveform (this layer)
              <select
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                value={activeLayer?.waveform ?? "square"}
                onChange={(e) =>
                  updateActiveLayer({
                    waveform: e.target.value as ChipWaveform,
                  })
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
              value={activeLayer?.duty ?? 0.5}
              onChange={(v) => updateActiveLayer({ duty: v })}
            />
            <Slider
              label="Layer gain (mix)"
              min={0.05}
              max={1}
              step={0.05}
              value={activeLayer?.gain ?? 0.5}
              onChange={(v) => updateActiveLayer({ gain: v })}
            />
            <label className="flex flex-col gap-1 text-xs text-zinc-500">
              Loop repeats (export)
              <input
                type="number"
                min={1}
                max={32}
                value={musicLoops}
                onChange={(e) => {
                  touchMusicCustom();
                  setMusicLoops(Math.max(1, Number(e.target.value) || 1));
                }}
                className="w-20 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
              />
            </label>
          </div>

          <p className="text-xs text-zinc-500">
            Editing layer {activeLayerIndex + 1} of {trackerLayers.length} — 16th notes, one bar 4/4.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
            {(activeLayer?.steps ?? []).map((step, i) => (
              <label
                key={i}
                className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2"
              >
                <span className="text-[10px] font-mono uppercase text-zinc-500">{i + 1}</span>
                <select
                  className="w-full rounded border border-zinc-700 bg-zinc-950 py-1 text-[11px] text-zinc-100"
                  value={stepSelectIndex(step)}
                  onChange={(e) => {
                    const opt = NOTE_OPTIONS[Number(e.target.value)];
                    if (opt) setLayerStep(activeLayerIndex, i, opt.freq);
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
              Download {musicDownloadName}
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
