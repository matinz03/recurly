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
  __tests__/            jest suites
test-utils/             shared test fixtures (outside __tests__ on purpose)
scripts/                build-time codegen
docs/                   this
type.d.ts               global types - Subscription and friends need no import
```

## How a screen is put together

Every tab screen follows the same shape, and diverging from it is usually a bug:

1. Read the store. Nothing fetches; there is no server.
2. Gate on `hasHydrated` — render before it and you're showing seed data.
3. Derive with `useMemo` from pure helpers. Nothing derived is stored.
4. Compose classes from `global.css`. No long inline utility strings.

Data flows one way: store → screen → presentational component. A component that
needs to change something takes a handler; it never reaches into the store
itself.

## State

Two persisted zustand stores, and no other durable state. See
[DATA-MODEL.md](DATA-MODEL.md) for the shapes and the persistence rules.

`lib/subscriptionStore.ts` is the single source of truth for subscriptions. Every screen derives from it — no screen keeps its own copy of the
list, and no screen reads `HOME_SUBSCRIPTIONS` directly (that constant is only
the store's seed).

Derived values (upcoming renewals, monthly spend, category breakdown) are
computed with `useMemo` in the screen that needs them, from helpers in
`lib/utils.ts`. Nothing derived is stored.

The store persists to AsyncStorage. Icons are stored as a serialisable
discriminator rather than the value itself — see DECISIONS.md, and don't
"simplify" it back. `hasHydrated` tells screens when the persisted data has
actually landed; render before that and you're showing the seed list.

`lib/preferencesStore.ts` holds reminders on/off, reminder lead days, base
currency and the theme preference. Two hooks turn preferences into behaviour:

- `lib/useThemePreference.ts` — applies light/system/dark through
  `Appearance.setColorScheme`, the single lever that moves both the CSS variables
  and `useColorScheme()`. Startup waits on this store's `hasHydrated` too, or the
  first frame renders in the OS theme and flips.
- `lib/useRenewalReminders.ts` → `lib/notifications.ts` — reschedules local
  notifications when the list or the preferences change. `expo-notifications` is
  imported lazily and guarded (`Platform.OS !== 'web'`, not Expo Go), because a
  top-level import registers a push-token side effect that red-boxes in Expo Go.

Insights is the one screen whose maths doesn't live in it: `lib/insights.ts`
exports a pure `computeInsights`, because the multi-currency rules are the most
bug-prone logic in the app and needed to be testable.

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

## Animation

`react-native-reanimated`, and only where it earns it. The card accordion
measures its body's natural height with `onLayout` and interpolates `height` and
`opacity` — the measured child must stay absolutely positioned, or it inherits
the animated height as its own constraint and measures 0. `ReduceMotion.System`
is honoured. The full three-attempt history is in DECISIONS.md; read it before
changing this.

Drag-to-dismiss on the create sheet uses `PanResponder`, not
`react-native-gesture-handler` — the reasoning, which is about responder
negotiation against the `Pressable`s inside the sheet, is also in DECISIONS.md.

## Testing

`npm test` runs `jest-expo` (pinned to 54.x — the latest peer-requires a newer
React than SDK 54 ships). Seven suites, ~100 assertions, all of it pure logic:
`lib/utils.ts`, `lib/insights.ts`, `lib/matchSubscriptionIcon.ts`, reminder
timing out of `lib/notifications.ts`, the type guards, and both persisted stores
including the icon round trip. Shared fixtures live in `test-utils/`.

No component rendering is tested. A test renderer has no layout engine, so it
could not have caught any of the layout and animation bugs this project has
actually shipped — see CONTRIBUTING.md on what the gates can't tell you.

CI additionally runs `npx expo export --platform web`. That is the only check
that catches a native module being evaluated in Node during static prerender —
typecheck, lint and tests all pass while the web build is broken.
