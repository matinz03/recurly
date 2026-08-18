# Recurrly

Subscription tracker built with Expo SDK 54, expo-router, NativeWind v5,
Clerk auth, zustand, and PostHog.

Track what you pay for, see when it renews, and see where the money goes.

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the keys — the app throws on boot
without them:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth. Sign-in is required to reach any tab. |
| `POSTHOG_PROJECT_TOKEN` | Analytics. |
| `POSTHOG_HOST` | Analytics host. |

```bash
npx expo start
```

Then open in Expo Go, a simulator, or a development build. Note the date picker
and blur effects are native modules with no web implementation, so the web
target is only useful for quick layout checks.

## Scripts

| Script | Does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | Dev server targeting one platform |
| `npm run lint` | ESLint via `expo lint` |
| `npm test` | Jest (`jest-expo` preset) |
| `npm run generate:brand-icons` | Regenerate `constants/brandIcons.ts` from simple-icons |

Typecheck with `npx tsc --noEmit -p .`. CI runs all of these on every PR.

## How it fits together

```text
app/          expo-router routes — (auth), (tabs), subscriptions/[id]
components/   presentational, no data fetching
constants/    seed data, icon maps, design tokens
lib/          store, hooks, pure helpers
scripts/      build-time codegen
docs/         architecture, decisions, roadmap
```

`lib/subscriptionStore.ts` is the single source of truth; screens derive from it
rather than holding their own copies.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layout, state, styling, conventions
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why things are the way they are. **Read
  before "simplifying"** anything that looks redundant; several oddities are
  load-bearing.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — prioritised backlog and known debt
- [`AGENTS.md`](AGENTS.md) — invariants that are easy to break silently
