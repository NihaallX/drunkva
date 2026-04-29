import sharp from "sharp";
import path from "path";

const ROOT = process.cwd();
const LOGO_SRC = path.join(ROOT, "public", "drunkva-logo.png");
const ORANGE = { r: 232, g: 98, b: 26 };

function isNearOrange(r, g, b) {
  const distance = Math.sqrt(
    (r - ORANGE.r) ** 2 +
    (g - ORANGE.g) ** 2 +
    (b - ORANGE.b) ** 2
  );
  return distance < 90;
}

async function extractWordmark() {
  const { data, info } = await sharp(LOGO_SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isNearOrange(r, g, b)) {
      data[i + 3] = 0;
      continue;
    }

    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    if (data[i + 3] < 220) data[i + 3] = 220;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .trim()
    .png();
}

async function makeIcon(wordmark, size, outputPath) {
  const mark = await wordmark
    .clone()
    .resize(Math.round(size * 0.8), Math.round(size * 0.28), { fit: "inside" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { ...ORANGE, alpha: 1 },
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(outputPath);
}

async function main() {
  const wordmark = await extractWordmark();
  await wordmark.clone().toFile(path.join(ROOT, "public", "drunkva-wordmark-white.png"));
  await makeIcon(wordmark, 512, path.join(ROOT, "public", "icons", "drunkva-512.png"));
  await makeIcon(wordmark, 192, path.join(ROOT, "public", "icons", "drunkva-192.png"));
  await makeIcon(wordmark, 180, path.join(ROOT, "public", "icons", "apple-touch-icon.png"));
  await makeIcon(wordmark, 180, path.join(ROOT, "public", "apple-icon.png"));
  await makeIcon(wordmark, 32, path.join(ROOT, "public", "favicon.png"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
