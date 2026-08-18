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
- [x] **Renewal notifications.** Local scheduled reminders a couple of days
      before each active renewal — see `lib/notifications.ts`. Expo Go's *push*
      (remote) support is limited on recent SDKs, but local scheduling works
      there; no development build needed for this specifically.
- [x] **Subscription detail route.** `app/subscriptions/[id].tsx` was a dead
      stub nothing linked to; it now shows the full record and is reachable from
      the list.
- [x] **Delete, pause/resume, status filters.**

## P0

- [x] **Consume `hasHydrated`.** All four consumers now gate on it, so no screen
      presents the seed list as real. The detail route mattered most: it was
      claiming a real subscription "couldn't be found" whenever a deep link beat
      hydration.
- [ ] **`expo export` belongs in the verification loop.** Typecheck, lint and
      tests all passed clean while the web build was completely broken by a
      native module touching `window` during static prerender. CI runs it now;
      remember it locally too.

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

- [x] **Expand/collapse animation.** Core RN `LayoutAnimation`, not
      `react-native-reanimated` - same reasoning as docs/DECISIONS.md's
      "Drag-to-dismiss uses PanResponder, not gesture-handler" entry: the
      built-in API needs no setup and animates the height change (plus a
      body fade) without measuring, and is skipped when the OS has
      reduce-motion on.
- [x] **Haptics** on expand, and on starting a cancel/delete flow - see
      `lib/haptics.ts`. Create is not wired: the only hookable point is the
      modal's submit handler, in files outside this change's scope
      (`components/CreateSubscriptionModal.tsx`, `app/(tabs)/*.tsx`).
- [ ] **Accessibility pass.** Interactive elements have labels, but the card
      itself doesn't announce expanded state, and contrast on
      `muted-foreground` over `card` is untested against WCAG AA.
- [x] **Dark mode.** Follows `userInterfaceStyle: "automatic"` via
      `@media (prefers-color-scheme: dark)` CSS-variable overrides in
      `global.css`, plus a `useThemeColors()` hook in `constants/theme.ts`
      for the JS-side colours (vector-icon `color` props, placeholders,
      `ActivityIndicator`). No in-app toggle - see docs/DECISIONS.md for the
      palette rationale, the two bundled-PNG-icon constraints it works
      around, and why category colours and the tab bar stay fixed.
- [x] **Settings screen is account-only.** Added `lib/preferencesStore.ts`
      (zustand + `persist`, mirroring `lib/subscriptionStore.ts`'s shape) for
      a reminders on/off switch and a 1/2/3/7-day lead-time picker;
      `lib/notifications.ts` reads both from the store instead of its old
      module constant, and `lib/useRenewalReminders.ts` also subscribes to
      the preferences store so a change takes effect immediately rather than
      waiting for the next subscription edit. "Clear stored data" resets
      subscriptions via `useSubscriptionStore.persist.clearStorage()` plus
      `setState({ subscriptions: [] })` (subscriptionStore.ts stayed
      untouched) and preferences via a `resetPreferences` action, behind an
      `Alert` confirmation. No display-currency preference yet - the app
      still never sums across currencies (see "Never sum across
      currencies" above), so there's nothing for a single preferred
      currency to control without reintroducing FX conversion.

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

Layout, keyboard, gesture and notification behaviour have never been exercised
on a device or simulator — every screen sits behind Clerk sign-in, so the web
preview can't reach them, and the date picker and blur are native-only. The
modal sheet sizing in particular was wrong twice before landing on its current
form. Treat all of it as unproven until someone runs it.
