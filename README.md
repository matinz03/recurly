# Recurrly

A subscription tracker for iOS and Android. Track what you pay for, see when it
renews, and see where the money actually goes.

Built with Expo SDK 54, expo-router, NativeWind v5, Clerk, zustand and PostHog.

## What it does

**Home** — the month at a glance: total committed spend, the next five renewals
as a carousel, and a short preview of the list with a link to all of it. Anything
renewing within a day reads "Today" or "Tomorrow" rather than a count.

**Subscriptions** — the full list, searchable, filterable by status. Tap a card
to expand it in place for plan, payment method, renewal and start date, plus
Edit, Pause/Resume, Cancel and Delete. Cancelling marks a subscription; it never
deletes it, because the record is the history of what you used to pay for.

**Insights** — monthly and yearly totals, average cost, spend by category, and
the top five by monthly cost. Amounts are never summed across currencies: the
figures are scoped to your largest currency and anything else is reported
separately, because the app does no FX conversion and a blended number would be
meaningless.

**Add / edit** — a drag-to-dismiss sheet. Type a name and it matches a brand icon
as you go, from bundled art or a generated simple-icons subset. Pick a start date
from a calendar, past or future. Note which card paid for it — a **name** and
optionally the **last four digits**, never a full card number.

**Settings** — light / system / dark, base currency, renewal reminders with a
configurable lead time, and clearing all stored data.

Everything is stored locally on the device. There is no backend: Clerk handles
sign-in, and nothing else leaves the phone except analytics events.

## Getting started

Node 24 — pinned in [`.nvmrc`](.nvmrc). npm 10 and npm 11 resolve dependencies
differently and a lockfile from one fails `npm ci` under the other.

```bash
nvm use
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

Open in Expo Go, a simulator, or a development build. The date picker, blur and
notifications are native modules with no useful web implementation, so the web
target is only good for quick layout checks — and note that local notifications
don't work in Expo Go at all; they need a development build.

## Scripts

| Script | Does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run android` / `ios` / `web` | Dev server targeting one platform |
| `npm run lint` | ESLint via `expo lint` |
| `npm test` | Jest (`jest-expo` preset) |
| `npm run generate:brand-icons` | Regenerate `constants/brandIcons.ts` from simple-icons |

Typecheck with `npx tsc --noEmit -p .`.

CI runs all of those plus `npx expo export --platform web` on every PR. That last
one is the only check that catches a native module being evaluated in Node during
static prerender, and it has caught two real breakages that everything else
passed straight through.

**None of it verifies layout, keyboard behaviour, gestures, colour or animation.**
Every one of those has shipped broken here with a fully green check run. Those
need a device.

## How it fits together

```text
app/          expo-router routes — (auth), (tabs), subscriptions/[id], onboarding
components/   presentational, no data fetching
constants/    seed data, icon maps, design tokens
lib/          stores, hooks, pure helpers
test-utils/   shared test fixtures
scripts/      build-time codegen
docs/         architecture, decisions, data model, accessibility, roadmap
```

`lib/subscriptionStore.ts` is the single source of truth; screens derive from it
with `useMemo` rather than holding their own copies.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layout, state, styling, how a screen is assembled
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — the `Subscription` shape, statuses, persistence, the icon round trip
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why things are the way they are. **Read
  before "simplifying"** anything that looks redundant; several oddities are
  load-bearing, and each one is there because it broke once.
- [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) — what's deliberate, and what isn't verified
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — gates, branches, lockfile refresh, conventions
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — prioritised backlog and known debt
- [`AGENTS.md`](AGENTS.md) — invariants that are easy to break silently
