# Architecture

Expo SDK 54 + expo-router app for tracking recurring subscriptions.
Read the versioned Expo docs (https://docs.expo.dev/versions/v54.0.0/) before
adding native surface area — the SDK moves fast and older recipes break.

## Layout

```text
app/                    expo-router routes (file = route)
  (auth)/               sign-in, sign-up, layout guard
  (tabs)/               index (home), subscriptions, insights, settings
  subscriptions/[id]    detail route
  _layout.tsx           Clerk + PostHog providers, font loading, splash
components/             presentational components, no data fetching
constants/              static data, icon maps, design tokens
  brandIcons.ts         GENERATED - see scripts/generate-brand-icons.js
lib/                    stores, hooks, pure helpers
scripts/                build-time codegen
docs/                   this
```

## State

`lib/subscriptionStore.ts` is a zustand store and the single source of truth for
subscriptions. Every screen derives from it — no screen keeps its own copy of the
list, and no screen reads `HOME_SUBSCRIPTIONS` directly (that constant is only
the store's seed).

Derived values (upcoming renewals, monthly spend, category breakdown) are
computed with `useMemo` in the screen that needs them, from helpers in
`lib/utils.ts`. Nothing derived is stored.

The store persists to AsyncStorage. Icons are stored as a serialisable
discriminator rather than the value itself — see DECISIONS.md, and don't
"simplify" it back. `hasHydrated` tells screens when the persisted data has
actually landed; render before that and you're showing the seed list.

## Styling

NativeWind v5. Component classes live in `global.css` under
`@layer components`; screens compose those classes rather than inlining long
utility strings. Design tokens are duplicated in two places by necessity:

- `global.css` `@theme` — for `className`
- `constants/theme.ts` — for values needed in JS (tab bar geometry, colors
  passed to non-NativeWind props like vector-icon `color`)

Keep them in sync when changing a token.

## Dates and money

All renewal math goes through `lib/utils.ts`:

- `nextRenewalDate(renewalDate, billing)` — a stored renewal date goes stale the
  moment it passes, so this rolls it forward by the billing period until it
  lands in the future. Anything showing "next renewal" must use this, not the
  raw field.
- `monthlyPrice(subscription)` — normalises yearly plans to a monthly figure so
  totals are comparable.
- Only `status === 'active'` subscriptions count toward spend totals; paused and
  cancelled ones would inflate every number.

## Icons

Two sources, checked in order by `lib/matchSubscriptionIcon.ts`:

1. `constants/icons.ts` — bundled PNGs for brands we ship art for.
2. `constants/brandIcons.ts` — generated subset of simple-icons, returned as raw
   SVG markup.

`Subscription.icon` is therefore `ImageSourcePropType | string`. **Never render
it with a bare `<Image source={icon}>`** — use `components/SubscriptionIcon.tsx`,
which branches on the type. A bare `Image` will fail on SVG-string icons.

## Testing

`npm test` runs `jest-expo` (pinned to 54.x — the latest peer-requires a newer
React than SDK 54 ships). Coverage is the pure helpers in `lib/utils.ts` and the
two persisted stores, including the icon round trip.

CI additionally runs `npx expo export --platform web`. That is the only check
that catches a native module being evaluated in Node during static prerender —
typecheck, lint and tests all pass while the web build is broken.
