const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Generate the "LUNCH" Leaf, Plate, Fork & Spoon logo from the user's uploaded image
function generateLunchEmblemSvg(mode = 'app-full') {
  // mode:
  // 'app-full': Full logo with circular emblem and LUNCH text below
  // 'icon-square': Centered emblem on square canvas with rounded corners for PWA
  // 'icon-pure': Centered emblem with transparent background

  const strokeColor = '#c85a17';
  const bgColor = '#fcfbfa';

  if (mode === 'app-full') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <style>
      .lunch-text {
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-weight: 800;
        font-size: 46px;
        letter-spacing: 0.32em;
        fill: ${strokeColor};
      }
    </style>
  </defs>

  <rect width="512" height="512" fill="${bgColor}" />

  <!-- Main Circular Emblem (Centered slightly above text) -->
  <g transform="translate(256, 195)">
    <!-- 1. Outer Ring -->
    <circle cx="0" cy="0" r="148" fill="none" stroke="${strokeColor}" stroke-width="13" stroke-linecap="round" />

    <!-- 2. Stylized Plate / Oval Rim at top -->
    <!-- Outer plate rim -->
    <path d="M -85 -30 C -85 -80 85 -80 85 -30 C 85 -10 65 10 40 20" fill="none" stroke="${strokeColor}" stroke-width="11" stroke-linecap="round" />
    <!-- Inner plate rim -->
    <path d="M -60 -36 C -60 -65 60 -65 60 -36 C 60 -24 45 -12 25 -6" fill="none" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" />

    <!-- 3. Spoon (Left side) -->
    <g transform="translate(-62, -6) rotate(-22)">
      <!-- Filled Spoon Bowl -->
      <path d="M 0 -36 C 18 -36 24 -14 18 16 C 14 36 -2 38 -12 18 C -22 -4 -18 -36 0 -36 Z" fill="${strokeColor}" />
      <!-- Spoon Handle -->
      <path d="M -2 24 C 2 38 12 52 18 64" fill="none" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" />
    </g>

    <!-- 4. Central Organic Leaf -->
    <!-- Leaf Body -->
    <path d="M -36 -2 C -40 -70 30 -115 50 -130 C 65 -70 55 10 -28 10 Z" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" />
    <!-- Center Vein -->
    <path d="M -26 4 C 0 -45 35 -90 48 -126" fill="none" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" />

    <!-- 5. Stem looping into Fork Handle & Fork (Right side) -->
    <!-- Sweeping Stem Loop -->
    <path d="M -30 -2 C -40 38 -32 92 0 115 C 38 132 82 120 102 75 C 108 58 102 40 102 24" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round" />

    <!-- Fork (Angled up-right at ~42 deg) -->
    <g transform="translate(68, 6) rotate(42)">
      <!-- Fork base / shoulder -->
      <path d="M -16 10 C -14 0 14 0 16 10 L 16 26 C 16 38 -16 38 -16 26 Z" fill="${strokeColor}" />
      <rect x="-7" y="26" width="14" height="24" rx="4" fill="${strokeColor}" />
      <!-- 4 Tines -->
      <line x1="-13" y1="10" x2="-13" y2="-22" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="-4" y1="10" x2="-4" y2="-25" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="4" y1="10" x2="4" y2="-25" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="13" y1="10" x2="13" y2="-22" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
    </g>
  </g>

  <!-- Wordmark: L U N C H -->
  <text x="268" y="424" text-anchor="middle" class="lunch-text">LUNCH</text>
</svg>`;
  }

  // Pure icon / square app icon mode: centered emblem with balanced margins
  const hasSquareBg = mode === 'icon-square';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${hasSquareBg ? `<rect width="512" height="512" rx="112" fill="${bgColor}" />` : ''}

  <!-- Main Circular Emblem (Centered) -->
  <g transform="translate(256, 256) scale(1.18)">
    <!-- 1. Outer Ring -->
    <circle cx="0" cy="0" r="148" fill="none" stroke="${strokeColor}" stroke-width="13" stroke-linecap="round" />

    <!-- 2. Stylized Plate / Oval Rim at top -->
    <path d="M -85 -30 C -85 -80 85 -80 85 -30 C 85 -10 65 10 40 20" fill="none" stroke="${strokeColor}" stroke-width="11" stroke-linecap="round" />
    <path d="M -60 -36 C -60 -65 60 -65 60 -36 C 60 -24 45 -12 25 -6" fill="none" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" />

    <!-- 3. Spoon (Left side) -->
    <g transform="translate(-62, -6) rotate(-22)">
      <path d="M 0 -36 C 18 -36 24 -14 18 16 C 14 36 -2 38 -12 18 C -22 -4 -18 -36 0 -36 Z" fill="${strokeColor}" />
      <path d="M -2 24 C 2 38 12 52 18 64" fill="none" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" />
    </g>

    <!-- 4. Central Organic Leaf -->
    <path d="M -36 -2 C -40 -70 30 -115 50 -130 C 65 -70 55 10 -28 10 Z" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round" />
    <path d="M -26 4 C 0 -45 35 -90 48 -126" fill="none" stroke="${strokeColor}" stroke-width="10" stroke-linecap="round" />

    <!-- 5. Stem looping into Fork Handle & Fork (Right side) -->
    <path d="M -30 -2 C -40 38 -32 92 0 115 C 38 132 82 120 102 75 C 108 58 102 40 102 24" fill="none" stroke="${strokeColor}" stroke-width="12" stroke-linecap="round" />

    <!-- Fork -->
    <g transform="translate(68, 6) rotate(42)">
      <path d="M -16 10 C -14 0 14 0 16 10 L 16 26 C 16 38 -16 38 -16 26 Z" fill="${strokeColor}" />
      <rect x="-7" y="26" width="14" height="24" rx="4" fill="${strokeColor}" />
      <line x1="-13" y1="10" x2="-13" y2="-22" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="-4" y1="10" x2="-4" y2="-25" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="4" y1="10" x2="4" y2="-25" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
      <line x1="13" y1="10" x2="13" y2="-22" stroke="${strokeColor}" stroke-width="5" stroke-linecap="round" />
    </g>
  </g>
</svg>`;
}

async function renderAll() {
  const publicDir = path.resolve(__dirname, '..', 'public');
  const distDir = path.resolve(__dirname, '..', 'dist');

  console.log('Rendering all icons and logos from new LUNCH image...');

  const fullSvg = generateLunchEmblemSvg('app-full');
  const iconSquareSvg = generateLunchEmblemSvg('icon-square');
  const iconPureSvg = generateLunchEmblemSvg('icon-pure');

  // Save SVG files
  fs.writeFileSync(path.join(publicDir, 'app-logo.svg'), fullSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconPureSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), iconSquareSvg, 'utf-8');

  // Also write to dist if it exists
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'app-logo.svg'), fullSvg, 'utf-8');
    fs.writeFileSync(path.join(distDir, 'icon.svg'), iconPureSvg, 'utf-8');
  }

  // Convert to PNGs using Sharp
  const fullBuffer = Buffer.from(fullSvg);
  const iconSquareBuffer = Buffer.from(iconSquareSvg);
  const iconPureBuffer = Buffer.from(iconPureSvg);

  // 1. app-logo.png (512x512 full logo with LUNCH text)
  await sharp(fullBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'app-logo.png'));

  // 2. favicon-32x32.png
  await sharp(iconPureBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // 3. apple-touch-icon.png (180x180)
  await sharp(iconSquareBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. pwa-192x192.png
  await sharp(iconSquareBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 5. pwa-512x512.png
  await sharp(iconSquareBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 6. pwa-maskable-512x512.png
  await sharp(iconSquareBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Copy to dist if dist exists
  if (fs.existsSync(distDir)) {
    const pngs = ['favicon-32x32.png', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png', 'app-logo.png'];
    for (const f of pngs) {
      fs.copyFileSync(path.join(publicDir, f), path.join(distDir, f));
    }
  }

  console.log('Successfully rendered all icons and logos!');
}

renderAll().catch(err => {
  console.error('Error rendering icons:', err);
  process.exit(1);
});
