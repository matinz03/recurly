# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Working in this repo

Read `docs/ARCHITECTURE.md` for the layout and `docs/DECISIONS.md` before
changing anything that looks redundant — several deliberate-looking oddities are
load-bearing and documented there. `docs/DATA-MODEL.md` covers the stored shapes,
`docs/CONTRIBUTING.md` the gates and workflow, `docs/ACCESSIBILITY.md` what's
deliberate in the a11y wiring, and `docs/ROADMAP.md` the prioritised backlog and
known debt.

## Non-negotiables

- **Never render `Subscription.icon` with a bare `<Image source={icon}>`.** It is
  `ImageSourcePropType | string`; the string case is raw SVG markup. Use
  `components/SubscriptionIcon.tsx`.
- **Never display a raw `renewalDate` as the next renewal.** Stored dates go
  stale. Route through `nextRenewalDate()` in `lib/utils.ts`.
- **Only `status === 'active'` counts toward spend totals.**
- **Never sum prices across currencies.** Group by currency instead.
- `lib/subscriptionStore.ts` is the single source of truth. Screens derive with
  `useMemo`; they don't keep their own copies and don't read `HOME_SUBSCRIPTIONS`
  directly.
- `constants/brandIcons.ts` is generated. Edit `scripts/generate-brand-icons.js`
  and run `npm run generate:brand-icons`.
- **Never store more card data than a label and the last four digits.** The label
  is free text and is validated by `containsCardNumber`; don't loosen it, and
  don't add expiry, CVC or a full number.
- **Editing a subscription must not change its `currency`.** Use
  `resolveSubscriptionCurrency` — there is no FX conversion, so a re-denominated
  amount is unrecoverable.
- **The card body measured for the expand animation stays absolutely
  positioned,** and `.sub-body` uses `pt-6` not `mt-6`. In normal flow it
  measures 0 and the card can't open; as a margin the last row is clipped.
- **Borders use `--color-border-strong`, not an opacity modifier.** Tailwind
  compiles `border-foreground/25` to `color-mix(in oklab, …)`, which renders
  nothing in light mode.
- **Confirmations use `components/ConfirmDialog.tsx`, not `Alert.alert`.**

## Conventions

- 4-space indentation, single quotes, TypeScript throughout.
- Styling is NativeWind v5. Add component classes to `global.css` under
  `@layer components` and compose those, rather than inlining long utility
  strings. Tokens are duplicated in `global.css` `@theme` and
  `constants/theme.ts` (the latter for values JS needs) — keep them in sync.
- Comment the *why* for non-obvious decisions. Don't narrate what the code
  already says.

## Before you call something done

```bash
npx tsc --noEmit -p .            # must be clean
npm run lint                     # no new warnings (7 pre-existing clsx/unused ones)
npm test                         # must pass
npx expo export --platform web   # catches native modules evaluated during prerender
```

Layout, keyboard and gesture behaviour cannot be verified in the web preview —
the app's screens sit behind Clerk sign-in. Say so rather than implying you
checked it on a device.
