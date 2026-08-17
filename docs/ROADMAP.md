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

- [ ] **Duplicate detection** when creating a subscription that already exists.
- [ ] **Empty state** for a brand-new account — the list just says "No
      subscriptions yet" with no path forward.
- [ ] **Reminder scheduling has no debounce.** Every store change reschedules
      everything. Stable identifiers mean redundant work rather than duplicate
      notifications, so it's a cost issue, not a correctness one.
- [ ] **Renewals inside the lead window get no reminder at all.** A plan
      renewing tomorrow is skipped because the two-day reminder time is already
      past. Arguably it should notify immediately instead.

## P2 — polish with real payoff

- [ ] **Expand/collapse animation.** Cards snap open. `react-native-reanimated`
      is already a dependency and unused.
- [ ] **Haptics** on create / cancel / expand. `expo-haptics` likewise
      installed and unused.
- [ ] **Accessibility pass.** Interactive elements have labels, but the card
      itself doesn't announce expanded state, and contrast on
      `muted-foreground` over `card` is untested against WCAG AA.
- [ ] **Dark mode.** `app.json` sets `userInterfaceStyle: "automatic"` but there
      is only a light palette, so the OS setting does nothing.
- [ ] **Settings screen is account-only.** No reminder lead-time control, no
      display-currency preference, no way to clear stored data.

## Known cosmetic debt

- `.modal-handle` is 6px tall with 2px borders, so the accent border reads as a
  fill rather than an outline.
- `.sub-icon` gained `bg-background`, which puts a cream tile behind logos on
  collapsed cards that have a coloured background.
- `app/subscriptions/[id].tsx` reuses `.insights-card` for its info panel — a
  cross-screen class leak that will rot. Wants its own `detail-*` class.
- 7 lint warnings, all `import/no-named-as-default` on `clsx`. Harmless, but
  they mask new warnings.

## Not verified anywhere

Layout, keyboard, gesture and notification behaviour have never been exercised
on a device or simulator — every screen sits behind Clerk sign-in, so the web
preview can't reach them, and the date picker and blur are native-only. The
modal sheet sizing in particular was wrong twice before landing on its current
form. Treat all of it as unproven until someone runs it.
