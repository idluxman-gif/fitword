/**
 * Generate PWA icons — purple background with white "X".
 * Uses Playwright to render SVG to PNG.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

async function generateIcon(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#7C3AED" rx="${Math.round(size * 0.18)}"/>
    <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial, Helvetica, sans-serif" font-weight="bold"
          font-size="${Math.round(size * 0.52)}" fill="white">X</text>
  </svg>`

  const html = `<html><body style="margin:0;padding:0;background:transparent">${svg}</body></html>`

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(html)
  const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: size, height: size } })
  await browser.close()
  return buffer
}

async function main() {
  for (const size of [192, 512]) {
    const buffer = await generateIcon(size)
    const outPath = path.join(__dirname, '..', 'public', `icon-${size}.png`)
    fs.writeFileSync(outPath, buffer)
    console.log(`Generated ${outPath} (${buffer.length} bytes)`)
  }
}

main().catch(console.error)
