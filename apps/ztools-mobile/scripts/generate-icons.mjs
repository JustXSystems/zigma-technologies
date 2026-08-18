import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(appRoot, 'assets');
const sourceLogo = path.resolve(appRoot, '../../public/assets/images/zigma.png');
const NAVY = '#0a1628';
const ORANGE = '#ff6b1a';

async function ensureSource() {
  if (!fs.existsSync(sourceLogo)) {
    throw new Error(`Logo not found at ${sourceLogo}`);
  }
}

async function writeSquareIcon(size, outputName, padding = 0.2, background = NAVY) {
  const logoSize = Math.round(size * (1 - padding * 2));
  const logo = await sharp(sourceLogo)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, outputName));
}

async function writeBrandMark() {
  const src = path.resolve(appRoot, '../../public/assets/images/zigma.png');
  const dest = path.join(assetsDir, 'brand-mark.png');
  fs.copyFileSync(src, dest);
}

async function writeNotificationIcon() {
  const size = 96;
  const logo = await sharp(sourceLogo)
    .resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'notification-icon.png'));
}

async function main() {
  await ensureSource();
  fs.mkdirSync(assetsDir, { recursive: true });

  await writeBrandMark();
  await writeSquareIcon(1024, 'icon.png');
  await writeSquareIcon(1024, 'android-icon-foreground.png', 0.24);
  await writeSquareIcon(1024, 'favicon.png', 0.18);
  await writeNotificationIcon();

  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: NAVY },
  })
    .png()
    .toFile(path.join(assetsDir, 'android-icon-background.png'));

  await sharp(sourceLogo)
    .resize(640, 640, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .flatten({ background: ORANGE })
    .negate()
    .png()
    .toFile(path.join(assetsDir, 'android-icon-monochrome.png'));

  console.log('Generated ZTools app icons in', assetsDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
