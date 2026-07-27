// Copies dist/index.html → dist/404.html for SPA routing on GitHub Pages.
// When Pages gets a 404 on a deep link, it serves 404.html, which loads the
// app and lets React Router handle the path.
import { copyFileSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { injectCaptureMeta } from './lib/capture-config.mjs'

function injectCaptureConfig(dir, anonKey) {
  let injected = 0
  for (const entry of readdirSync(dir)) {
    const target = join(dir, entry)
    if (statSync(target).isDirectory()) { injected += injectCaptureConfig(target, anonKey); continue }
    if (!entry.endsWith('.html')) continue
    const html = readFileSync(target, 'utf8')
    if (!html.includes('/js/pg-capture.js')) continue
    writeFileSync(target, injectCaptureMeta(html, anonKey))
    injected++
  }
  return injected
}

const captureKey = process.env.VITE_SUPABASE_ANON_KEY || ''
if (process.env.CI && !captureKey) throw new Error('postbuild-pages: VITE_SUPABASE_ANON_KEY is required for production capture pages')
const capturePages = captureKey ? injectCaptureConfig('dist', captureKey) : 0
if (!captureKey) console.warn('postbuild-pages: capture configuration omitted (VITE_SUPABASE_ANON_KEY unavailable)')

copyFileSync('dist/index.html', 'dist/404.html')
console.log(`postbuild-pages: capture config injected into ${capturePages} page(s); copied dist/index.html → dist/404.html`)
