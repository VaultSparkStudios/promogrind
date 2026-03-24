import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const svg = readFileSync(join(__dirname, 'og-image.svg'))

await sharp(svg)
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(join(root, 'public', 'og-image.png'))

console.log('✓ Generated public/og-image.png (1200×630)')
