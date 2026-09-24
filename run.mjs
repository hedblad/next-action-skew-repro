// Opens a tab on deployment "a", replaces the server with the new deployment on the same origin,
// like a rolling deploy, and then submits the Server Action form or clicks a <Link> in that tab.
//
//   node run.mjs <action|navigation> <new deployment's directory under deployments/>
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright';

const [scenario, newDeployment] = process.argv.slice(2);
const origin = 'http://localhost:3456';

const log = (message) => console.log(`  ${message}`);

const startServer = async (deploymentId, directory) => {
  const server = spawn('npx', ['next', 'start', '-p', '3456'], {
    cwd: `deployments/${directory}`,
    env: { ...process.env, DEPLOYMENT_ID: deploymentId },
  });
  for (;;) {
    try {
      await fetch(origin);
      return server;
    } catch {
      await sleep(100);
    }
  }
};

const stopServer = async (server) => {
  server.kill();
  await new Promise((resolve) => server.once('exit', resolve));
};

const browser = await chromium.launch();
const page = await browser.newPage();

// Playwright's pageerror event misses this crash, so forward uncaught errors from the page.
await page.addInitScript(() => {
  addEventListener('error', (event) => console.error(`uncaught: ${event.message}`));
});
page.on('console', (message) => message.type() === 'error' && log(message.text()));

let server = await startServer('a', 'a');
await page.goto(origin);
await page.waitForLoadState('networkidle');

await stopServer(server);
server = await startServer('b', newDeployment);

// Only log from here on: what the stale tab does after the deploy.
let reloaded = false;
page.on('request', (request) => {
  if (request.resourceType() === 'document') {
    reloaded = true;
    log(`full page load: ${request.url()}`);
  } else if (!reloaded && request.url().includes('dpl=b')) {
    log(`stale tab loads a chunk from b: ${request.url().replace(origin, '')}`);
  }
});
page.on('response', (response) => {
  const request = response.request();
  if (request.method() === 'POST' || request.headers()['rsc']) {
    const id = response.headers()['x-nextjs-deployment-id'] ?? '(missing)';
    log(`${request.method()} response ${response.status()}, x-nextjs-deployment-id: ${id}`);
  }
});

await page.click(scenario === 'action' ? '#increment' : '#other-link');
await sleep(3000);

const shown = await page.evaluate(() => document.querySelector('main')?.innerText ?? '(nothing)');
log(`page shows: ${shown.replace(/\s+/g, ' ')}`);

await browser.close();
await stopServer(server);
