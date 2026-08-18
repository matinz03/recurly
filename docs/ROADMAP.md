# Roadmap

Prioritised by "how badly does its absence hurt a real user", not by effort.

## Shipped

- [x] **Persist the store.** `zustand/middleware` `persist` over AsyncStorage,
      with a version and migrate seam. Icons are stored as a discriminator
      (`IconKey` or SVG markup) because a bundled PNG is a Metro asset
      reference that isn't stable across builds — see `docs/DECISIONS.md`.
- [x] **Never sum across currencies.** `totalsByCurrency()` groups by currency;
      Home features the largest and lists the rest, Insights drives its
      breakdowns from the dominant currency and names what it excluded. No FX
      conversion — that would mean a network dependency, caching and staleness
      handling. The create form has a currency picker so input matches the maths.
- [x] **Unit tests.** `jest-expo` (pinned to 54.x — latest peer-requires a newer
      React than SDK 54 ships). Covers the date/money helpers and the store,
      including the icon persistence round trip.
- [x] **Renewal notifications.** Local scheduled reminders a configurable number
      of days before each active renewal — see `lib/notifications.ts`. Needs a
      development build: `expo-notifications` is disabled outright in Expo Go
      (`isRunningInExpoGo()`), because a top-level import registers a push-token
      side effect that red-boxes there. The module is imported lazily for the
      same reason.
- [x] **Subscription detail route.** `app/subscriptions/[id].tsx` was a dead
      stub nothing linked to; it now shows the full record and is reachable from
      the list.
- [x] **Delete, pause/resume, status filters.**
- [x] **Appearance, currency and reminder preferences.** `lib/preferencesStore.ts`
      plus a Settings screen: light/system/dark, base currency, reminders on/off
      with a lead-time picker, and clear-all-data. Startup waits on this store's
      hydration so the first frame can't render in the wrong theme.
- [x] **Themed confirmations.** `components/ConfirmDialog.tsx` replaces
      `Alert.alert` everywhere, so destructive confirmations follow the app's
      palette and type instead of the OS's.
- [x] **Card payment label, safely.** A card name plus optional last four digits,
      with PAN-like input rejected outright. Editing a subscription no longer
      overwrites the currency it was priced in.
- [x] **Test coverage over the risky logic.** Seven suites, ~100 assertions. The
      Insights aggregation moved into `lib/insights.ts` to make its
      multi-currency rules testable; reminder timing, icon matching and the type
      guards are covered too.
- [x] **Project documentation.** Architecture, data model, decisions,
      accessibility, contributing, and a README that says what the app does.

## P0

- [x] **Consume `hasHydrated`.** All four consumers now gate on it, so no screen
      presents the seed list as real. The detail route mattered most: it was
      claiming a real subscription "couldn't be found" whenever a deep link beat
      hydration.
- [x] **`expo export` belongs in the verification loop.** Typecheck, lint and
      tests all passed clean while the web build was completely broken by a
      native module touching `window` during static prerender. It's a CI step
      now, and it's in the gate list in `docs/CONTRIBUTING.md` and `AGENTS.md`.

## P1

- [ ] **Analytics run with no consent step.** PostHog is initialised at app
      start and captures events before the user agrees to anything, and there's
      no privacy copy or opt-out. Raised by CodeRabbit; it's a product/legal
      call, not a code one, so it's recorded rather than decided here.

- [x] **Duplicate detection** when creating a subscription that already
      exists. `findDuplicateSubscriptionByName()` in `lib/utils.ts` warns
      (never blocks) on a case-/punctuation-insensitive name match, excluding
      the record being edited. `CreateSubscriptionModal` takes an optional
      `existingSubscriptions` prop the screens still need to wire up.
- [x] **Empty state** for a brand-new account. `components/EmptySubscriptions.tsx`
      replaces the bare "No subscriptions yet" text with a short explanation
      and an add-subscription call to action; the screens still need to swap
      it in for `ListEmptyComponent`.
- [ ] **Reminder scheduling has no debounce.** Every store change reschedules
      everything. Stable identifiers mean redundant work rather than duplicate
      notifications, so it's a cost issue, not a correctness one.
- [x] **Renewals inside the lead window now get a catch-up reminder** an hour
      out, rather than being skipped entirely. Tradeoff: once delivered, such a
      reminder is no longer "scheduled", so reopening the app inside the window
      can queue another. Suppressing that needs persisted delivery state.

## P2 — polish with real payoff

- [x] **Expand/collapse animation.** A measured-height Reanimated accordion,
      after `LayoutAnimation` barely played under the new architecture and
      `entering`/`exiting` broke the closing direction. Honours reduce-motion.
      Three attempts, all recorded in docs/DECISIONS.md - read that before
      touching it.
- [x] **Haptics** on expand, and on starting a cancel/delete flow - see
      `lib/haptics.ts`. Create is not wired: the only hookable point is the
      modal's submit handler, in files outside this change's scope
      (`components/CreateSubscriptionModal.tsx`, `app/(tabs)/*.tsx`).
- [ ] **Accessibility pass, on a device.** The wiring is done and documented in
      `docs/ACCESSIBILITY.md`: composed row labels, `accessibilityState.expanded`
      on the card toggle, radio roles and selected state on the pickers, live
      regions behind the hydration gates, and card ink chosen by measured
      luminance with a test that keeps every category colour on the right side of
      the threshold. What's left is the part no code change settles - a real
      VoiceOver and TalkBack pass, `muted-foreground` on `card` checked against
      WCAG AA with a contrast tool, and behaviour at large accessibility font
      sizes, where several fixed-height rows will probably clip.
- [x] **Dark mode.** Follows `userInterfaceStyle: "automatic"` via
      `@media (prefers-color-scheme: dark)` CSS-variable overrides in
      `global.css`, plus a `useThemeColors()` hook in `constants/theme.ts`
      for the JS-side colours (vector-icon `color` props, placeholders,
      `ActivityIndicator`). A light/system/dark override now sits in Settings,
      applied through `Appearance.setColorScheme` - see docs/DECISIONS.md for the
      palette rationale, the two bundled-PNG-icon constraints it works
      around, and why category colours and the tab bar stay fixed.
- [x] **Settings screen is account-only.** Added `lib/preferencesStore.ts`
      (zustand + `persist`, mirroring `lib/subscriptionStore.ts`'s shape) for
      a reminders on/off switch and a 1/2/3/7-day lead-time picker;
      `lib/notifications.ts` reads both from the store instead of its old
      module constant, and `lib/useRenewalReminders.ts` also subscribes to
      the preferences store so a change takes effect immediately rather than
      waiting for the next subscription edit. "Clear stored data" calls
      `clearSubscriptions()` and `resetPreferences()`, both of which persist an
      empty/default state rather than removing the key - `clearStorage()` isn't
      awaitable and races the next write, which could resurrect the seed list -
      behind a themed `components/ConfirmDialog.tsx`. A base-currency preference
      was added later: amounts are entered in it and new records adopt it, while
      existing records keep the currency they were priced in, and the app still
      never sums across currencies.

## Known cosmetic debt

- `.detail-status-badge` is `bg-background`, which in dark mode is a near-black
  pill sitting on a fixed light category pastel. Legible (light ink on the dark
  pill), but reads as an odd dark chip on a pale card — wants a fixed token like
  the ink around it.

- `.modal-handle` is 6px tall with 2px borders, so the accent border reads as a
  fill rather than an outline.
- `.sub-icon` gained `bg-background`, which puts a cream tile behind logos on
  collapsed cards that have a coloured background.
- `app/subscriptions/[id].tsx` reuses `.insights-card` for its info panel — a
  cross-screen class leak that will rot. Wants its own `detail-*` class.
- ~~7 lint warnings on `clsx`~~ — fixed by switching to the named import.
  Lint is at zero, so a new warning is now visible instead of lost in noise.

## Not verified anywhere

Layout, keyboard, gesture behaviour and native notification delivery are not
verified by any automated check — every screen sits behind Clerk sign-in, so the
web preview can't reach them, and the date picker, blur and notifications are
native-only. Reminder *timing* is covered by
`lib/__tests__/notifications.test.ts`; what isn't covered is whether a scheduled
reminder actually arrives, and how permissions and channels behave on a device.

Track record, as a warning: the modal sheet sizing was wrong twice, the Android
keyboard inset twice, and the expand animation three times, each after a green
check run. Device feedback is the only thing that has caught any of it.

Also unverified: no screen-reader pass (VoiceOver or TalkBack), no automated a11y
checks, and no testing at large accessibility font sizes — several rows are
fixed-height and will likely clip. See `docs/ACCESSIBILITY.md`.
