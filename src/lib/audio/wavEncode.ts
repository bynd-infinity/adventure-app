/** Encode mono float samples (-1..1) as 8-bit unsigned PCM WAV. */

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) {
    view.setUint8(offset + i, s.charCodeAt(i)!);
  }
}

export function encodeFloatToWav8Mono(
  samples: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const n = samples.length;
  const dataSize = n;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < n; i++) {
    const f = Math.max(-1, Math.min(1, samples[i]!));
    view.setUint8(offset++, Math.round((f + 1) * 127.5));
  }
  return buffer;
}

export function downloadArrayBuffer(
  buffer: ArrayBuffer,
  filename: string,
  mime = "audio/wav",
) {
  const blob = new Blob([buffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
