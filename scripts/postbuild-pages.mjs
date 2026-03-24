// Copies dist/index.html → dist/404.html for SPA routing on GitHub Pages.
// When Pages gets a 404 on a deep link, it serves 404.html, which loads the
// app and lets React Router handle the path.
import { copyFileSync } from 'fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('postbuild-pages: copied dist/index.html → dist/404.html')
