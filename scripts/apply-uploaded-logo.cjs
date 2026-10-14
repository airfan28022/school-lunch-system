const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function processUploadedLogo() {
  const inputFile = path.resolve(__dirname, '..', 'temp-uploaded-logo.png');
  const publicDir = path.resolve(__dirname, '..', 'public');
  const distDir = path.resolve(__dirname, '..', 'dist');

  if (!fs.existsSync(inputFile)) {
    console.error('File not found:', inputFile);
    process.exit(1);
  }

  console.log('Processing uploaded web logo into all App and Web icon sizes...');

  // 1. Generate app-logo.png (512x512)
  await sharp(inputFile)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'app-logo.png'));

  // 2. Generate favicon-32x32.png (32x32)
  await sharp(inputFile)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));

  // 3. Generate apple-touch-icon.png (180x180)
  await sharp(inputFile)
    .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 4. Generate pwa-192x192.png (192x192)
  await sharp(inputFile)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 5. Generate pwa-512x512.png (512x512)
  await sharp(inputFile)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 6. Generate pwa-maskable-512x512.png (with safe zone padding inside central 80%)
  await sharp(inputFile)
    .resize(410, 410, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 7. Generate vector SVG containing the image
  const base64Png = fs.readFileSync(path.join(publicDir, 'app-logo.png')).toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#ffffff" />
  <image href="data:image/png;base64,${base64Png}" width="512" height="512" preserveAspectRatio="xMidYMid meet" />
</svg>`;

  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'app-logo.svg'), svgContent, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), svgContent, 'utf-8');

  // Copy to dist if dist exists
  if (fs.existsSync(distDir)) {
    const files = [
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'pwa-192x192.png',
      'pwa-512x512.png',
      'pwa-maskable-512x512.png',
      'app-logo.png',
      'app-logo.svg',
      'icon.svg'
    ];
    for (const f of files) {
      fs.copyFileSync(path.join(publicDir, f), path.join(distDir, f));
    }
  }

  console.log('All App and Web icons successfully updated with the uploaded logo!');
}

processUploadedLogo().catch(err => {
  console.error('Error processing uploaded logo:', err);
  process.exit(1);
});
