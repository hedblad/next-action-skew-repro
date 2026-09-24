# Server Action responses bypass `deploymentId` version skew detection

Minimal reproduction: with `deploymentId` configured, a Server Action that re-renders the page (`revalidatePath`, `refresh`, `updateTag`, cookie mutation) returns an RSC payload from the new deployment without any deployment ID. The client applies it to a tab still running the old deployment, which loads the new deployment's client chunks into the old Turbopack runtime and crashes with `Module X was instantiated because it was required from module Y, but the module factory is not available`.

## Run it

```sh
pnpm install --ignore-workspace
npx playwright install chromium
./repro.sh
```

`repro.sh` builds three deployments from the same code, then runs each scenario in a headless browser:

1. Open `/` while deployment `a` is serving it.
2. Stop `a` and start the new deployment on the same port, like a rolling deploy.
3. From the stale tab, either click a button calling a Server Action that calls `revalidatePath('/')`, or click a `<Link>` to `/other`.

The deployments:

- `.next-a`: the old deployment.
- `.next-b`: the new deployment. It adds a client component (`app/new-feature.jsx`) that imports a new module (`app/shared.js`). `instrumentation-client.js` also imports that module, so Turbopack places it in the bootstrap chunks every page loads up front, and the new component's own chunks don't carry it. In a real app the same thing happens whenever a deploy changes a module in the bootstrap chunks, for example a dependency bump of React, Next.js or Sentry: module IDs include the package's versioned path.
- `.next-b-workaround`: the same as `b`, plus `headers()` in `next.config.mjs` sending `x-nextjs-deployment-id` on every response.

Both builds use the same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and `deploymentId` values `a` and `b`, as the self-hosting guide recommends. The Server Action IDs are identical in both builds, so the stale tab's action succeeds on the new server.

## Result

See `repro-output.txt` for the full log.

| Scenario | Response header | Outcome |
| --- | --- | --- |
| Server Action, new deployment `b` | `x-nextjs-deployment-id` missing | Uncaught `Module 99427 was instantiated because it was required from module 52898, but the module factory is not available`; nothing is rendered |
| `<Link>` navigation, new deployment `b` | `x-nextjs-deployment-id: b` | Full page load onto `b` (expected) |
| Server Action, `b` with the workaround header | `x-nextjs-deployment-id: b` | Flight data discarded, refresh, full page load onto `b`; the mutation's result (`Count: 1`) is shown |
| `<Link>` navigation, `b` with the workaround header | `x-nextjs-deployment-id: b` | Full page load onto `b` (expected) |

Reproduces on `next@16.3.6` and `next@16.4.0-canary.42`.
