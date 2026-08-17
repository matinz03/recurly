# Roadmap

Prioritised by "how badly does its absence hurt a real user", not by effort.

## P0 — the app is misleading without these

- [ ] **Persist the store.** Everything created, edited, or cancelled is lost on
      app restart; the seed list comes back. This is the single biggest gap — a
      tracker that forgets what you tracked. `zustand/middleware` `persist` +
      `@react-native-async-storage/async-storage`, with a schema version so
      future shape changes can migrate rather than corrupt.
- [ ] **Mixed currencies are summed as one number.** `monthlyPrice` adds raw
      prices and `formatCurrency` labels the total USD. Two subscriptions in
      different currencies produce a confidently wrong total. Either constrain
      input to a single display currency, or convert before summing.
- [ ] **Unit tests.** `nextRenewalDate`, `daysUntil`, `monthlyPrice`,
      `matchSubscriptionIcon`, and the price validation are pure and
      high-traffic, and several have already regressed once. `jest-expo`.

## P1 — expected of a subscription tracker

- [ ] **Renewal notifications.** The core value proposition ("never miss a
      payment", per the sign-up copy) is currently not implemented at all.
      `expo-notifications`, scheduled per subscription, rescheduled on edit.
- [ ] **`app/subscriptions/[id].tsx` is a stub** rendering `Subscription
      Details: {id}`. Nothing links to it. Either build the detail view or
      delete the route — a dead route is worse than no route.
- [ ] **No delete.** Cancel marks status; there's no way to remove a row added
      by mistake.
- [ ] **Nothing can set `status: 'paused'`.** The status exists in the type, the
      seed data, and the Insights breakdown, but no UI produces it.
- [ ] **Status filtering** on the Subscriptions list (active / paused /
      cancelled chips). The `.category-chip` styles already exist and would
      carry it.

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
- [ ] **Duplicate detection** when creating a subscription that already exists.
- [ ] **Empty state** for a brand-new account — the list just says "No
      subscriptions yet" with no path forward.

## Known cosmetic debt

- `.modal-handle` is 6px tall with 2px borders, so the accent border reads as a
  fill rather than an outline.
- `.sub-icon` gained `bg-background`, which puts a cream tile behind logos on
  collapsed cards that have a coloured background.
- `package.json` has a `reset-project` script pointing at
  `scripts/reset-project.js`, which does not exist.
- 7 lint warnings, all `import/no-named-as-default` on `clsx` plus one unused
  import in a placeholder screen. Harmless, but they mask new warnings.
