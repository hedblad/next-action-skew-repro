// Simulates a deploy under an open tab: load the page from deployment "a", replace the server
// with deployment "b" on the same origin, then act in the stale tab.
//
//   node run.mjs action      # Server Action that calls revalidatePath
//   node run.mjs navigation  # client-side <Link> navigation
//   NEW_DIST=.next-b-workaround node run.mjs action
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const scenario = process.argv[2] ?? 'action';
const newDist = process.env.NEW_DIST ?? '.next-b';
const PORT = 3456;
const origin = `http://localhost:${PORT}`;

const start = async (id, distDir) => {
  const proc = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, DEPLOYMENT_ID: id, DIST_DIR: distDir, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  proc.stdout.on('data', (d) => process.stdout.write(`  [server ${id}] ${d}`));
  proc.stderr.on('data', (d) => {
    if (!/DEP0169|trace-deprecation/.test(d)) process.stdout.write(`  [server ${id}] ${d}`);
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(origin)).ok) return proc;
    } catch {}
    await sleep(100);
  }
  throw new Error(`server ${id} did not start`);
};

const stop = async (proc) => {
  proc.kill('SIGTERM');
  await new Promise((resolve) => proc.once('exit', resolve));
};

const log = (msg) => console.log(`${new Date().toISOString().slice(11, 23)} ${msg}`);

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => log(`console.${m.type()}: ${m.text().split('\n')[0]}`));
page.on('framenavigated', (f) => f === page.mainFrame() && log(`navigated: ${f.url()}`));
page.on('request', (r) => {
  const url = r.url();
  if (r.method() === 'POST') log(`request: POST ${url} next-action=${r.headers()['next-action']}`);
  else if (r.headers()['rsc']) log(`request: RSC GET ${url}`);
  else if (r.resourceType() === 'document') log(`request: document ${url} (full page load)`);
  else if (url.includes('/_next/static/chunks/') && url.includes('dpl=b')) log(`request: chunk ${url.replace(origin, '')}`);
});
// Playwright's pageerror event misses these, so collect uncaught errors in the page and forward them.
await page.addInitScript(() => {
  const report = (msg) => console.error(`uncaught: ${msg}`);
  addEventListener('error', (e) => report(e.message));
  addEventListener('unhandledrejection', (e) => report(String(e.reason?.message ?? e.reason)));
});
page.on('response', async (r) => {
  const req = r.request();
  if (req.method() === 'POST' || req.headers()['rsc']) {
    log(`response: ${r.status()} ${req.method()} x-nextjs-deployment-id=${r.headers()['x-nextjs-deployment-id'] ?? '(none)'}`);
  }
});

let server = await start('a', '.next-a');
await page.goto(origin);
await page.waitForLoadState('networkidle');
log(`stale tab ready: "${await page.textContent('#deployment')}"`);

log(`--- deploying b (${newDist}) ---`);
await stop(server);
server = await start('b', newDist);

if (scenario === 'action') {
  await page.click('#increment');
} else {
  await page.click('#other-link');
}
await sleep(3000);
await page.waitForLoadState('networkidle').catch(() => {});

log('--- result ---');
const rendered = await page.evaluate(() => document.querySelector('main')?.innerText.replace(/\s+/g, ' ') ?? '(nothing rendered)');
log(`page shows: ${rendered}`);

await browser.close();
await stop(server);
