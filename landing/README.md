# Recurrly landing page

Marketing site for Recurrly. Standalone Next.js 16 app (App Router, Turbopack,
Tailwind v4) that happens to live inside the Expo repo so it can share the app's
real design tokens, fonts and brand icons.

```bash
npm install --prefix landing
npm run dev --prefix landing      # http://localhost:3000
```

`npm run build --prefix landing` and `npm run typecheck --prefix landing` are the
gates. There is no ESLint config here — `next lint` was removed in Next 16, and
the repo-root ESLint config ignores `landing/`.

## How it stays on-brand

The design isn't reinterpreted, it's mirrored:

- `app/globals.css` `@theme` duplicates the token values from the app's
  `global.css` and `constants/theme.ts` — cream `#fff9e3`, ink `#081126`, coral
  `#ea7a53`, mint `#8fd1bd`, `--color-nav-chrome` fixed navy in both themes.
  Dark mode is a `prefers-color-scheme` override of `:root`, which is what
  NativeWind v5 compiles the app's `dark:` variants to.
- The two-opposite-corners motif from the logo and `.home-balance-card` is the
  `corner-xl/lg/md/sm` utilities. They set **only**
  `border-top-right-radius` + `border-bottom-left-radius`, so they compose with
  Tailwind's own radius utilities instead of fighting them.
- Category wash colours are copied from `constants/categories.ts`. They're data,
  not theme, so they stay light in dark mode and pair with fixed `#081126` ink.
- `public/brand/*` and `app/fonts/*` are copies of the app's actual PNG icons and
  the five Plus Jakarta Sans weights. The app ships five RN font *families*
  because React Native can't synthesise weights; on the web it's one family with
  five weight files.

The component classes in `@layer components` intentionally mirror their app
counterparts by name (`.upcoming-card`, `.sub-card`, `.insights-track`, …) so a
change in the app has an obvious landing-page counterpart.

### Tailwind v4 gotcha

`@apply` only accepts real utilities. Anything declared as a plain class in
`@layer components` can't be `@apply`-ed, which is why `corner-*`, `fade-bottom`
and `fade-right` are `@utility` declarations. Layer order is
`theme, base, components, utilities`, so call-site utilities beat the component
classes — that's how the small button variants (`px-5 py-2.5 text-sm`) work
without a `.btn-sm`.

## The phone mockup

`components/PhoneHome.tsx` is an **HTML recreation** of the Home screen, not a
screenshot. Every screen in the app sits behind Clerk sign-in, so a real capture
isn't reproducible in CI. Its numbers are internally consistent with
`components/InsightsPanel.tsx`: 7 subscriptions, $155.96/mo, $1,871.52/yr,
$22.28 average, and five category bars that sum to exactly $155.96.

If the app's Home layout changes, this file has to be updated by hand — nothing
enforces it.

## The download button

`lib/release.ts` hits `GET /repos/matinz03/recurly/releases/latest` with
`next: { revalidate: 3600 }` and picks the first asset ending in `.apk`. On a
non-200, a missing APK, or a throw it returns `PINNED` — v1.0.0-alpha.1 — so the
button still works offline and under the unauthenticated API's rate limit.
`pinned: true` is on that fallback if you ever want to surface it in the UI.

The page is `export const revalidate = 3600` for the same reason: the release
metadata (tag, size, date) is rendered server-side into the hero, the download
section and the footer.

## Living inside the Expo repo

Four things in the repo root exist to keep this folder out of the app's way:

| File | Why |
| --- | --- |
| `tsconfig.json` `exclude` | root `include` is `**/*.ts(x)`, so `npx tsc --noEmit -p .` would otherwise typecheck this Next app with the app's config |
| `eslint.config.js` `ignores` | same reason for `npm run lint` |
| `metro.config.js` `blockList` | Metro crawls the project root and would watch `landing/node_modules` — a second copy of react and react-dom |
| `.gitignore` | `.next/`, `next-env.d.ts`, `landing/out/` |

And `next.config.ts` pins `turbopack.root` to this folder, because with the
repo-root lockfile present Turbopack infers the wrong workspace root and starts
tracing the React Native app.
