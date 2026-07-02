// One-off script: rasterizes public/favicon.svg into the favicon file set
// (favicon.ico, PNG sizes, apple-touch-icon) used by index.html.
//
// Usage: node generate-favicon.js

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const svgPath = fileURLToPath(new URL('./public/favicon.svg', import.meta.url))
const outDir = fileURLToPath(new URL('./public/', import.meta.url))
const svgBuffer = readFileSync(svgPath)

const targets = [
  { file: 'favicon-16x16.png', size: 16 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'favicon-192x192.png', size: 192 },
  { file: 'apple-touch-icon.png', size: 180 },
]

async function generate() {
  console.log('Reading public/favicon.svg...')

  for (const { file, size } of targets) {
    const outPath = outDir + file
    await sharp(svgBuffer, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(outPath)
    console.log(`  Generated ${file} (${size}x${size})`)
  }

  // favicon.ico bundles the 16x16 and 32x32 PNGs into a single multi-resolution icon file
  const png16 = await sharp(svgBuffer, { density: 384 }).resize(16, 16).png().toBuffer()
  const png32 = await sharp(svgBuffer, { density: 384 }).resize(32, 32).png().toBuffer()
  const icoBuffer = await pngToIco([png16, png32])
  writeFileSync(outDir + 'favicon.ico', icoBuffer)
  console.log('  Generated favicon.ico (16x16 + 32x32)')

  console.log('\nDone. All favicon files written to public/.')
}

generate().catch((err) => {
  console.error('Favicon generation failed:', err)
  process.exit(1)
})
