# Server Action responses bypass `deploymentId` version skew detection

With `deploymentId` configured, a Server Action that re-renders the page (here `revalidatePath`) returns the new deployment's RSC payload without any deployment ID. A tab still running the previous deployment applies it, loads the new deployment's client chunks into its old Turbopack runtime, and crashes:

```
Uncaught Error: Module 65599 was instantiated because it was required from module 54064, but the module factory is not available.
```

A `<Link>` navigation in the same situation gets `x-nextjs-deployment-id` and does a full page load, as the [version skew docs](https://nextjs.org/docs/app/guides/self-hosting#version-skew) describe.

## Run it

```sh
pnpm install
npx playwright install chromium
./repro.sh
```

## What it does

`app/` is deployment `a`. Deployment `b` is `app/` plus the files in `deployment-b/`, which changes two things:

- `app/page.jsx` renders a new client component, `NewFeature`.
- `instrumentation-client.js` uses the same module as `NewFeature` (`app/shared.js`). That puts the module in the bootstrap chunks every page loads up front, so `NewFeature`'s own chunk doesn't include it. A tab still on `a` never loaded those bootstrap chunks. In real apps the same happens whenever a deploy changes a module in the bootstrap chunks, for example a dependency bump of React, Next.js or an error-tracking SDK, because module IDs include the package's versioned path.

`repro.sh` builds `a`, `b`, and `b` again with the workaround from `next.config.mjs`. All builds use the same `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, as the [self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting#server-functions-encryption-key) recommends, so the Server Action ID is the same in every deployment.

For each scenario, `run.mjs` opens `/` in a headless browser while `a` is serving it, replaces the server with the new deployment on the same port, like a rolling deploy, and then either submits the form that calls the Server Action or clicks the `<Link>` to `/other`.

## Result

From `repro-output.txt`:

| Stale tab on `a` | Server now | Response header | Outcome |
| --- | --- | --- | --- |
| Server Action | `b` | `x-nextjs-deployment-id` missing | Loads `b`'s chunks, crashes with "module factory is not available", nothing rendered |
| `<Link>` navigation | `b` | `x-nextjs-deployment-id: b` | Full page load onto `b` |
| Server Action | `b` with workaround | `x-nextjs-deployment-id: b` | Discards `b`'s tree, refreshes, full page load onto `b` showing `count 1` |
| `<Link>` navigation | `b` with workaround | `x-nextjs-deployment-id: b` | Full page load onto `b` |

Reproduces on `next@16.3.6` and `next@16.4.0-canary.43`.
