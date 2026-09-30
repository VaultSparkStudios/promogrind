// Rendered-state verification using the installed Chromium and shared capture helper.
// Fixtures are injected only into the isolated browser; none enter public/ or dist/.
import fs from 'node:fs';
import { withChromiumPage, evaluateInPage } from './lib/chromium-cdp.mjs';
const origin = process.argv[3] || 'http://127.0.0.1:5173';
const dir = 'docs/visual-qa/s132';
const sourcePath = process.argv[2] || '.cache/s132-real-stats.json';
const real = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
fs.mkdirSync(dir, { recursive: true });
const rows = [];
await withChromiumPage({}, async ({ pageCdp, wait }) => {
  await pageCdp.send('Page.enable');
  await pageCdp.send('Runtime.enable');
  await pageCdp.send('Network.enable');
  await pageCdp.send('Network.setBypassServiceWorker', { bypass: true });
  for (const theme of ['dark', 'light']) for (const width of [1440, 390]) {
    const height = width === 390 ? 844 : 1000;
    await pageCdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 });
    for (const state of ['source', 'stale', 'unavailable', 'privacy']) {
      const feed = structuredClone(real);
      if (state === 'stale') {
        feed.generatedAt = new Date(Date.now() - 172800000).toISOString();
        for (const row of [feed, ...feed.history]) row.metrics.forEach(m => { m.computedAt = feed.generatedAt; });
      }
      if (state === 'privacy') for (const row of [feed, ...feed.history]) row.metrics.forEach(m => {
        delete m.value; delete m.smallCountOk;
        m.available = false; m.privacySuppressed = true;
        m.unavailableReason = 'Withheld for privacy: fewer than 10 contributing accounts.';
      });
      const setup = await pageCdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `
        localStorage.setItem('pg_theme', ${JSON.stringify(theme)});
        const originalFetch = window.fetch;
        window.fetch = (url, options) => String(url).endsWith('/stats.json')
          ? Promise.resolve(new Response(${JSON.stringify(JSON.stringify(feed))}, { status: ${state === 'unavailable' ? 503 : 200}, headers: { 'Content-Type':'application/json' } }))
          : originalFetch(url, options);` });
      for (const route of state === 'source' ? ['/', '/stats'] : ['/stats']) {
        await pageCdp.send('Page.navigate', { url: origin + route });
        let ready = false;
        for (let attempt = 0; attempt < 30; attempt++) {
          ready = await evaluateInPage(pageCdp, `document.body?.innerText.includes('Saved work. Recorded outcomes.') || false`);
          if (ready) break;
          await wait(500);
        }
        if (!ready) throw new Error(`Stats surface missing at ${route}: ` + await evaluateInPage(pageCdp, 'document.body.innerText.slice(0, 1000)'));
        await wait(300);
        const positions = state !== 'source' ? ['[data-public-stats]'] : route === '/' ? ['[data-public-stats]', 'footer'] : ['nav', '[data-public-stats]', 'main > section:nth-of-type(2)', 'main > section:last-of-type'];
        for (let i = 0; i < positions.length; i++) {
          await evaluateInPage(pageCdp, `document.querySelector(${JSON.stringify(positions[i])})?.scrollIntoView({block:'start', behavior:'instant'})`);
          await wait(100);
          const check = await evaluateInPage(pageCdp, `(() => ({overflow: document.documentElement.scrollWidth > innerWidth, text: document.body.innerText, background: getComputedStyle(document.body).backgroundColor}))()`);
          if (check.overflow) throw new Error(`Horizontal overflow: ${route} ${width} ${theme} ${state}`);
          if (!check.text.includes('Saved work. Recorded outcomes.')) throw new Error('Stats surface missing');
          if (state === 'stale' && !check.text.includes('Stale report')) throw new Error('Stale notice missing');
          if (state === 'unavailable' && !check.text.includes('Statistics unavailable')) throw new Error('Unavailable notice missing');
          if (state === 'privacy' && !check.text.includes('Withheld for privacy')) throw new Error('Privacy suppression missing');
          const file = `s132/after-${route === '/' ? 'home' : 'stats'}-${state}-${theme}-${width}-${i}.png`;
          const shot = await pageCdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
          fs.writeFileSync(`docs/visual-qa/${file}`, Buffer.from(shot.data, 'base64'));
          rows.push({ file, page: `${route} ${state} ${positions[i]}${state === 'source' ? ' (actual aggregate query)' : ' (isolated fault/privacy fixture)'}`, theme, viewport: { width, height } });
        }
      }
      await pageCdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: setup.identifier });
    }
  }
});
fs.writeFileSync(`${dir}/captures.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify({ ok: true, captures: rows.length, manifest: `${dir}/captures.json` }));
