# Minimal reproduction — instant-navigation validation reports a deliberate `redirect()` as a failure

With `cacheComponents: true`, a layout that redirects from inside its own `<Suspense>` boundary —
the shape the Cache Components migration guide recommends — makes every request to that route log
an `instant` validation error in `next dev`.

Tested on `next@16.4.0-canary.32`, `react@19.3.0`, Node 26.8.2.

## Steps

```bash
npm install
npm run dev
```

Then request `/dashboard` **twice**:

```bash
curl -s -o /dev/null http://localhost:3000/dashboard   # cold — nothing logged
curl -s -o /dev/null http://localhost:3000/dashboard   # warm — the error appears
```

The second request is the point: on the cold compile the message is suppressed, so one request
looks like it does not reproduce.

## What happens

```
Error: Route "/dashboard": Could not validate `instant` because the target segment was prevented
from rendering, likely due to the following error.
Error: An error occurred while attempting to validate instant UI. This error may be preventing the
validation from completing.
    at DashboardLayout (app/dashboard/layout.tsx:13:5)
  [cause]: Error: NEXT_REDIRECT
      at Shell (app/dashboard/layout.tsx:23:13)
    environmentName: 'Prefetch',
    digest: 'NEXT_REDIRECT;replace;/elsewhere;307;'
```

Nothing is broken at runtime — the redirect happens and `/elsewhere` renders. `redirect()` here is
ordinary control flow (a gate: no cookie, no dashboard), not an error.

## Neither documented opt-out helps

| Attempt | Result |
| --- | --- |
| baseline | error logged; response is 200 |
| `export const instant = false` in `app/dashboard/layout.tsx` | **no change** — the reported line numbers shift by the added line, so the config is loaded; the message stays |
| `export const instant = false` in `app/dashboard/page.tsx` | **hard 500** — `"instant" is a route segment config and can only be used when the segment is a Server Component module` |

The page is a Client Component, which is the common case for an interactive dashboard page, so the
page-level opt-out is not available at all.

## It also hides real findings on the same request

Replace `app/dashboard/page.tsx` with a Server Component that does blocking IO:

```tsx
import { connection } from "next/server"

export default async function DashboardPage() {
  await connection()
  return <p>dashboard</p>
}
```

Then request `/dashboard` twice each way:

| Request | Logged |
| --- | --- |
| `curl -H 'Cookie: seeded=1' .../dashboard` (redirect does **not** fire) | `Next.js encountered uncached data …` → `blocking-prerender-dynamic` — correct |
| `curl .../dashboard` (redirect fires) | only `Could not validate \`instant\` …`; the real finding is gone |

## Files

- `next.config.mjs` — `cacheComponents: true`, `partialPrefetching: true`
- `app/dashboard/layout.tsx` — `<Suspense>` wrapping an async shell that reads `cookies()` and
  `redirect()`s
- `app/dashboard/page.tsx` — `"use client"`
- `app/elsewhere/page.tsx` — the redirect target
