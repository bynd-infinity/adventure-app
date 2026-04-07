/**
 * Removes near-white pixels (flat backgrounds) from PNGs in public/characters.
 * Run after adding new portraits: npm run process-characters
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const CHAR_DIR = path.join(__dirname, "..", "public", "characters");
const WHITE = 248;

async function processFile(filename) {
  const inputPath = path.join(CHAR_DIR, filename);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (r >= WHITE && g >= WHITE && b >= WHITE) {
      out[i + 3] = 0;
    }
  }

  const tmp = path.join(CHAR_DIR, `.${filename}.tmp.png`);
  await sharp(out, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, inputPath);
  console.log("OK", filename);
}

async function main() {
  if (!fs.existsSync(CHAR_DIR)) {
    console.error("Missing folder:", CHAR_DIR);
    process.exit(1);
  }
  const files = fs
    .readdirSync(CHAR_DIR)
    .filter((f) => f.toLowerCase().endsWith(".png"));
  for (const f of files) {
    await processFile(f);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
