# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# Working in this repo

Read `docs/ARCHITECTURE.md` for the layout and `docs/DECISIONS.md` before
changing anything that looks redundant — several deliberate-looking oddities are
load-bearing and documented there. `docs/ROADMAP.md` holds the prioritised
backlog and known debt.

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
npx tsc --noEmit -p .   # must be clean
npm run lint            # no new warnings (7 pre-existing clsx/unused ones)
npm test                # must pass
```

Layout, keyboard and gesture behaviour cannot be verified in the web preview —
the app's screens sit behind Clerk sign-in. Say so rather than implying you
checked it on a device.
