# Decisions

Short log of choices that aren't obvious from the code, and would otherwise get
"cleaned up" back into a bug.

## Generate a simple-icons subset instead of importing it

`simple-icons` ships a ~5.2 MB `index.js` holding all ~3,450 brands, and Metro
does not tree-shake, so `import { siNetflix } from 'simple-icons'` pulls every
byte into the bundle and evaluates it during startup.

`scripts/generate-brand-icons.js` extracts a curated subset (~123 KB) at build
time into `constants/brandIcons.ts`, keyed by normalized name for O(1) lookup.
The dependency lives in `devDependencies` and is only needed to regenerate.

Consequences: a name that isn't in the curated list falls back to a generic
icon. Widen `WANTED` in the script and re-run rather than reaching for the
runtime import. Note simple-icons has dropped several major brands (Slack,
LinkedIn, Amazon, Disney, Xbox, Adobe products) for trademark reasons — those
need bundled PNGs in `constants/icons.ts` instead.

## Match brand names on whole words, never substrings

`lib/matchSubscriptionIcon.ts` matches the full name, then each word, always by
exact equality on the normalized string. Substring matching looks more
forgiving but mismatches badly: "Canva" would match simple-icons' unrelated
"Canvas" icon.

## Modal sheet: `max-h` + a non-flex ScrollView

`.modal-container` uses `max-h-[85%]` and the `ScrollView` inside carries **no**
`flex-1`.

- `flex-1` sets `flex-basis: 0`, so the ScrollView contributes no height to its
  content-sized parent and the sheet collapses to just the header. RN's
  ScrollView already ships `flexGrow: 1, flexShrink: 1, flexBasis: auto`, which
  is exactly what's wanted: measure to content, shrink under the cap, scroll.
- A **percentage** max-height resolves against the parent, which
  `KeyboardAvoidingView` has already shrunk. An absolute cap computed from
  `useWindowDimensions()` does not, and strands the submit button behind the
  keyboard.

Measuring heights in JS and setting them via `onLayout` also works but flashes
an oversized sheet on the first frame, before the measurement lands.

## Keyboard insets: iOS only

Android is left alone. Expo defaults `android.softwareKeyboardLayoutMode` to
`resize`, so the window already shrinks by the keyboard height; adding a spacer
or a `KeyboardAvoidingView` on top of that double-counts and leaves a keyboard's
worth of dead space. `automaticallyAdjustKeyboardInsets` is an iOS-only prop, so
it can't double-apply.

## `ListHeaderComponent` takes an element, not a function

An inline arrow function is a new component *type* every render, so React
unmounts and remounts the whole header subtree — losing any state inside it,
including a nested horizontal `FlatList`'s scroll offset, and defocusing a
`TextInput`.

## Expand state lives in a ref as well as state

`lib/useExpandedSubscription.ts` mirrors the expanded id in a ref because refs
update synchronously. Deriving the next value from the state variable means two
taps batched into one React update both read the same stale value, so the card
never collapses and the analytics event fires twice with `expanded: true`.

## Roll renewal dates forward rather than fixing the seed data

Seed renewal dates are in the past. Rather than editing them to be "currently
plausible" (which rots again), `nextRenewalDate` rolls any past date forward by
its billing period. That's also correct behaviour for real data: a monthly plan
that renewed in March has renewed several times since.

The Upcoming carousel shows the soonest N renewals rather than a fixed window,
so it is never mysteriously empty.

## No charting library for Insights

The Insights screen draws bars with plain `View`s and percentage widths. A chart
library is a large native/JS dependency for four bar rows, and the
simple-icons episode above is the cautionary tale about bundle weight.

## Drag-to-dismiss uses PanResponder, not gesture-handler

`react-native-gesture-handler` and `react-native-reanimated` are installed but
unused elsewhere, and there is no `GestureHandlerRootView` at the root. Core
`PanResponder` + `Animated` needs no setup. The tradeoff is a JS-thread gesture;
fine for a modal dismiss, revisit if it feels laggy on low-end devices.

## Cancel marks status, it does not delete

Cancelling sets `status: 'cancelled'` and keeps the record, so it still appears
in history and the status breakdown while dropping out of spend totals. Delete
is a separate action — see below.

## Native modules must be guarded for static web export

`app.json` sets `web.output: "static"`, so `expo export` evaluates every module
reachable from a route **in Node** to prerender pages. Anything that touches
`window` or a native module at import time — or on a code path reachable during
that pass — fails the entire web build.

This has bitten twice: AsyncStorage's web backend (via the persist middleware)
and expo-notifications. Both are now guarded (`Platform.OS === 'web'` short
circuits, and a no-op storage backend when there's no `window`).

**`tsc`, `eslint` and `jest` all pass while the web build is completely
broken.** `npx expo export --platform web` is the only check that catches this,
which is why CI runs it and why it's a hard gate on any change touching a
native module.

## Icons are persisted as a discriminator, never as the value

A bundled PNG resolves through `require()` to a Metro asset reference that is
only valid for the bundle that produced it. Persisting one would look correct
until the next build, then silently resolve to the wrong asset — or nothing —
for every stored subscription.

`lib/subscriptionStore.ts` therefore writes `{ kind: 'bundled', key }` or
`{ kind: 'svg', markup }` and swaps back on rehydrate. Do not "simplify" this by
persisting `icon` directly.

## Totals group by currency; there is no FX conversion

Live rates mean a network dependency, caching, staleness and offline handling —
too much machinery for the value right now. `totalsByCurrency()` groups instead,
and no code path ever adds two different currencies together. Screens feature
the dominant currency and name what they excluded rather than blending.

## Screens gate on `hasHydrated`

The store starts out holding the seed list, so anything rendered before
AsyncStorage resolves is data the user may not own. Every consumer waits.

The detail route is the reason this matters beyond cosmetics: it was rendering
"This subscription couldn't be found" for records that existed, whenever a deep
link beat hydration.

The fallback must be a stable reference (`NO_SUBSCRIPTIONS`), not a fresh `[]`
per render, or it busts the `useMemo` dependencies downstream.

## Cancel and Delete are different, and the UI has to say so

Cancel sets `status: 'cancelled'` and keeps the record — it stays in history and
the status breakdown, and drops out of spend. Delete removes it permanently and
has no undo. Users reasonably assume Cancel deletes, so the confirmation copy
contrasts them explicitly, and Delete is deliberately the *least* prominent
control on the card rather than the most.

## Expand animation is a measured-height accordion

Animating a card open means animating content of unknown height. Three
approaches were tried on device, in this order:

1. **`LayoutAnimation`.** No measuring needed, core RN, no-op web shim. But under
   the new architecture (`newArchEnabled: true`) RN's own source says layout
   animations are "unconditionally enabled for Android, and conditionally enabled
   on iOS (pending fully shipping)" - and in practice the card barely animated on
   Android either.
2. **Reanimated `entering`/`exiting` on the body.** Opening looked right; closing
   did not. `exiting` detaches the view from layout while it fades, so the card
   reflowed to its collapsed height immediately and every row below snapped up
   while the body was still moving. Matching the durations didn't help, because
   the container was never animating in the first place.
3. **What's there now.** The body stays mounted, its natural height is measured
   with `onLayout`, and a shared value interpolates `height` and `opacity`
   between 0 and that height. Both halves are on the same clock in both
   directions.

Two things about the current version are load-bearing:

- **The measured child is absolutely positioned.** As a normal-flow child it
  inherits the animated height as its own constraint, so while collapsed it
  measured 0 and the card could never open at all. That shipped once.
- **`.sub-body` uses `pt-6`, not `mt-6`.** A top margin sits outside the measured
  box, offsetting the content below the animated height and clipping the last
  row.

The body is always mounted, so it's also taken out of the accessibility tree and
out of touch handling while collapsed (`accessibilityElementsHidden`,
`importantForAccessibility`, `pointerEvents`) - otherwise a screen reader would
read hidden rows and taps would land on invisible buttons.

Reduce-motion is honoured via `ReduceMotion.System`.

Reanimated's web runtime was the original reason to avoid it, given the static
export gate. The export still passes; the gate catches it if that changes.

## Dark mode follows the OS, via CSS variables, not a `.dark` class

NativeWind v5 (`^5.0.0-preview.4`) is a thin wrapper over `react-native-css`,
which is what actually compiles the Tailwind output. Checked directly against
`node_modules/react-native-css/dist/module/compiler/selectors.js`: a
`@media (prefers-color-scheme: dark) { :root { ... } }` block (CSS variable
overrides) and `dark:` utility variants both compile through the same
generic media-query path and work today. A class-based `.dark` ancestor
selector (`darkMode: "class"`, the mechanism most v2/v4 tutorials assume) is
explicitly **not** wired up - the matching branches in that file are present
only as commented-out code. That rules out an in-app light/dark toggle
without a class strategy nobody has built yet, which is moot anyway: the
brief was to follow `userInterfaceStyle: "automatic"`, not add a preference.

Confirmed against the real build too, not just the source: `npx expo export
--platform web` and inspecting the emitted CSS shows the `@theme` overrides
and every `dark:` utility compiled into their own
`@media (prefers-color-scheme: dark)` blocks.

## Dark mode palette: darkened accent, not inverted, lightened `muted`

The dark palette (see `global.css`'s media-query override block and
`constants/theme.ts`'s `darkColors`) is warm near-black/brown surfaces with a
warm ivory ink, not a straight inversion of the light tokens. Two choices
need the reasoning written down or a future edit will "simplify" them back
into a contrast bug:

- **`accent` is darker in dark mode, not just desaturated.** In light mode
  `accent` is a fill holding *dark navy* ink (`text-primary`) on top, so a
  bright coral works. In dark mode `primary` is light ink, so the same fill
  now sits under *light* text - keeping the light-mode brightness would blow
  out that contrast (measured ~2.7:1 against light ink). The dark accent
  (`#a84c2b`, a deeper terracotta) is deliberately dark enough to hold ~4.5:1
  under light ink and white alike, at the cost of being weaker as a small
  *text* colour on the page background (~3.3-3.6:1) - same trade-off the
  light theme already makes (`text-accent` on `background` is ~2.7:1 there),
  just less bad. Left under AA there in both themes; fixing it would mean
  picking a different accent hue entirely, not a lighter/darker version of
  this one.
- **`muted` is lighter than a "dark surface" token would usually be.**
  `icons.back` and `icons.add` are bundled PNGs baked to a fixed dark-navy
  colour with no runtime tint (confirmed by opening the assets - unlike the
  tab bar's icons, which are baked white and are the reason the tab bar
  background is pinned to a fixed colour regardless of theme, see below).
  They render inside `bg-muted`/`bg-accent` tiles (`.detail-back`, `.fab`),
  so `muted` has to stay light enough for a fixed dark glyph to clear
  WCAG's 3:1 non-text contrast floor against it. The fallback subscription
  icon (`icons.plus`, also fixed dark-navy) has the same problem inside
  `.sub-icon`/`.upcoming-icon`/`.detail-hero-icon`, which normally use
  `bg-background` (too dark for this in dark mode) - those three classes get
  a `dark:bg-muted` override rather than changing `background` itself.

## Tab bar chrome is pinned, not theme-reactive

The tab bar's icons (`icons.home`, `icons.wallet`, `icons.activity`,
`icons.setting`) are bundled PNGs baked white, with no runtime tint applied
in `TabIcon`. Following the theme for the bar's background would mean the
icons vanish into it half the time, so `app/(tabs)/_layout.tsx` uses a new
`NAV_CHROME_BACKGROUND` constant (`constants/theme.ts`) instead of the
theme-reactive palette - fixed dark in both light and dark mode, same as
before dark mode existed. A real fix would recolour or re-export those PNGs
per theme; out of scope here (icon assets and `constants/icons.ts` aren't
part of this change).

## Category colours are data, not theme, and stay fixed

`CATEGORY_COLORS` in `CreateSubscriptionModal` and the `color` persisted on
each subscription render as card backgrounds (`SubscriptionCard`,
`app/subscriptions/[id].tsx`). They're fixed pastels chosen to hold dark ink,
not part of the app's palette, so they don't adapt to dark mode - inverting
them would need a wholly different set of colours, not a themed version of
the same ones, and they're independent of `userInterfaceStyle` by design (a
category is the same category regardless of OS appearance).

The consequence has to be handled explicitly, though: the app's ink
(`primary`/`mutedForeground`) *does* flip to light text in dark mode, and
light text on a light pastel is invisible. So the text painted directly on a
fixed pastel (`SubscriptionCard`'s collapsed head row when `color` is set;
`[id].tsx`'s hero name/price/billing) is pinned to the static light-theme ink
(`colors`, `constants/theme.ts`'s original export) instead of
`useThemeColors()`'s reactive one. Everything else on those screens -
expanded cards (`bg-subscription`, themed), the status badge inside the hero
(its own `bg-background` fill, themed) - keeps reacting normally.

## `.home-balance-*` keeps literal `text-white`, not theme ink

The home balance card is always a solid `bg-accent` fill, never inverted, so
its text stays literal white in both themes rather than switching to
`text-primary`. White-on-accent is actually better in dark mode (~5.6:1) than
in light mode, where it's a pre-existing gap (~2.7:1, not introduced or fixed
by this change - see the "Accessibility pass" roadmap item).

## Haptics fire on outcomes, not on intent

A destructive haptic on *tapping* Cancel or Delete buzzes the user for being
asked a question, then stays silent at the moment the record actually changes.
The warning haptic therefore lives in the `Alert` confirmation callback, not the
button handler. Create/save gets a success haptic; Edit and Pause/Resume get
nothing, being routine and reversible.

## The stub: what the radius vocabulary means

Before this, `global.css` had 33 radius declarations: 17 `rounded-full`, 13
`rounded-2xl`, and exactly one asymmetric pair — `rounded-bl-4xl rounded-tr-4xl`
on the balance card. The most distinctive gesture in the app appeared once and
meant nothing.

It's now a system. One rounded diagonal with the opposing corners left sharp
marks **a billing artifact** — the balance card, subscription cards, upcoming
cards, the detail hero. It reads as a torn ticket or receipt stub, which is
genuinely of this product's world rather than imported decoration, and the
radius scales with the card (`4xl` hero, `3xl` detail, `2xl` list cards).

App chrome deliberately does *not* get it: search bar, inputs, insight panels
stay uniformly `rounded-2xl`, controls stay `rounded-full`. So the geometry
carries information — artifact versus container — instead of variety.

If you're adding a surface, ask which it is. Don't split the difference.

## Money renders through one component

`components/Money.tsx` exists for tabular figures. Plus Jakarta Sans is
proportional, so `1` is narrower than `4` and a column of prices wanders — the
decimals don't line up, which is the exact comparison this app is for.

It can't be a class: react-native-css compiles `font-variant-caps` but not
`font-variant-numeric`, so it has to be RN's `fontVariant` style prop.
Centralising it also means a new amount can't quietly forget it.

Prose keeps `formatCurrency` directly — tabular figures mid-sentence look wrong.

## Known: the palette is the default AI look

`#fff9e3` warm cream with a `#ea7a53` terracotta accent is, almost exactly, the
most common look generated design converges on. It came with the original
template rather than being chosen here, and the dark palette was built to match
it.

Left alone deliberately: it's the product's existing identity, and replacing it
is a call for whoever owns the brand, not a cleanup. Flagged so it's a decision
rather than an accident. The type system has the related gap — one family
(Plus Jakarta Sans) at four weights doing display and body both, with no
pairing. Fixing that needs a licensed display face, which is also a choice to
be made rather than assumed.

## Icon tiles stay light in both themes

Brand marks are drawn for light grounds, so the tile behind them doesn't invert.
`--color-icon-tile` is cream in light and a dimmed ivory in dark.

It used to reuse `muted`, which in dark is `#6e6151` — a muddy olive that looked
dirty behind a logo. `muted` is deliberately light for a different reason (fixed
dark-navy glyphs on it need 3:1), so the two uses needed separating rather than
retuning one token for both.

Note some bundled PNGs (Adobe) carry their own opaque background, so they will
look different from the transparent ones whatever this token is. Fixing that
means replacing the asset.

## The lockfile is regenerated in a clean directory, not in place

`npm ci` in CI failed four separate times on lockfile drift, and the last cause
was the subtle one: running `npm install --package-lock-only` inside the working
copy resolves against the `node_modules` already on disk. `bufferutil` and
`utf-8-validate` are optional native addons of `ws` that fail to build on a
Windows machine without MSVC, so npm had pruned them locally and then wrote a
lockfile that omitted them. Linux CI can build them, computes an ideal tree that
includes them, and reports `Missing: bufferutil from lock file`.

Deleting the lockfile first doesn't help - npm still reuses the tree on disk. To
regenerate it, copy `package.json` alone into an empty directory, run
`npm install --package-lock-only` there, and copy the result back.

Related earlier causes, all now covered: npm 10 (Node 20) and npm 11 (Node 24)
resolve optional and peer deps differently, so `.nvmrc` pins the version CI
uses; and platform-specific optional binaries have to be present for every
platform, not just the one that generated the file.

## Confirmations are a themed dialog, not `Alert.alert`

`Alert.alert` renders an OS dialog with no styling surface at all: it can't
follow the palette, the type or the corner treatment, and on Android it looks
like a different product entirely. Every destructive confirmation - cancel,
delete, clear data - goes through `components/ConfirmDialog.tsx`, which reuses
the same sheet vocabulary as the rest of the app.

It's controlled rather than promise-based on purpose: the caller owns which
action is pending, so the dialog can't get out of step with it. On the
Subscriptions screen that's a single `pendingAction` state covering both cancel
and delete, which is also what stops two dialogs racing.

The confirm label is always the verb ("Delete", "Clear data"), never "OK", so the
button says what will happen rather than agreeing with a question.

## Payment details are a label and four digits, and nothing more

A subscription records which card paid for it, because "which card is this on"
is a real question when you're auditing spend. It records a **name** for the card
and optionally its **last four digits** - never a full number, never an expiry,
never a CVC. Storing more would turn a local list of subscriptions into a
payment-data problem, with everything that follows from that.

The label is free text, so it is validated: anything containing twelve or more
digits after separators are stripped is rejected outright, with an inline message
explaining what to enter instead. Without that, a pasted card number was
persisted exactly as typed. `containsCardNumber` in `lib/utils.ts` is the check;
the floor sits below the shortest real PAN (13 digits) to leave no room.

## An existing subscription keeps the currency it was priced in

Amounts are entered in the base currency chosen in Settings, and new records
adopt it. Editing an existing record does **not**: `resolveSubscriptionCurrency`
keeps whatever it was priced in.

Otherwise changing the preference from USD to EUR and then editing an unrelated
field would silently re-denominate a stored amount - USD 10 becomes EUR 10 with
no conversion - which also contradicts what Settings tells the user, that
changing the preference doesn't convert saved amounts.

There is no FX conversion anywhere in the app (see the totals decision above),
so a re-denominated amount is unrecoverable: nothing knows what it used to be.

## Startup waits for the theme preference, not just fonts and auth

`useThemePreference` can't apply the saved light/system/dark choice until
preferences come back from AsyncStorage. Rendering before then shows one frame in
the OS theme and flips - clearly visible on a cold start with a dark preference
on a light device.

So `hasHydrated` from the preferences store joins fonts and auth in the
splash-hide condition and in the render gate. It's the same reason screens gate
on the subscription store's `hasHydrated`, one level up.

## Borders use a real token, not an opacity modifier

`border-foreground/25` looks like the obvious way to get a hairline. Tailwind
compiles it to a literal fallback immediately overridden by
`color-mix(in oklab, ...)`, so the rendered colour depends on a runtime colour
function - and in light mode the result was nothing at all, while dark mode
worked. "View all" and the carousel cards both lost their borders that way.

`--color-border-strong` is a real token with a value per theme, so the compiled
CSS is a single literal `border-color: var(--color-border-strong)`. Any border
that needs to be visibly there uses it. Verified by reading the compiled output,
not by assuming.

## Insights aggregation lives in `lib/insights.ts`, not in the screen

The multi-currency rules are the most bug-prone logic in the app - two
regressions have shipped in them - and while the maths sat inside a `useMemo` in
the screen, none of it could be tested without rendering. `computeInsights` is
pure, takes the subscription list, and returns every figure the screen draws.

The screen keeps only presentation: the bar widths relative to the largest row,
and the hydration gate.

## The client keys live in `eas.json`, committed

`eas.json`'s `base` profile carries `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST` as literals, and the other profiles
extend it. That looks like committed secrets. It isn't:

- A Clerk **publishable** key is designed to ship in clients - that's what the
  `EXPO_PUBLIC_` prefix means here, and Expo's babel plugin inlines the literal
  into the JS bundle at build time regardless of where it came from.
- A PostHog **project** API key (`phc_…`) is the same: it's the value in every
  web snippet, write-only, and it ships inside the app.

Both are readable by anyone who unzips the APK, so putting them in EAS's secret
store would protect nothing while costing the ability to read them back.

`.env` is still gitignored and is what local `expo start` reads. It has to be
duplicated here because EAS Build archives what git tracks, so an ignored `.env`
never reaches the build server - and the two steps that need these values,
bundling the JS and evaluating `app.config.js`, both run there. A cloud build
without them produces an APK that throws
`Add your Clerk Publishable Key to the .env file` at launch, before any screen
renders.

The tradeoff accepted: the repo now hardcodes one Clerk instance and one PostHog
project, so a fork or a second environment edits committed config instead of
setting a variable. For anything beyond personal test builds, move these to
`eas env:create --visibility sensitive` and drop the `env` block.

Because the values are inline, no profile needs an `environment` field - that one
selects which set of server-side EAS variables a build pulls, and there are none
to pull. If these move to `eas env:create` later, each profile will need it.

`preview` also pins `android.buildType: "apk"`. It's the profile used for
sideloadable test builds, and while internal distribution produces an APK today,
a default that later changed to AAB would yield something that can't be installed
from a GitHub release.

## The icon set is generated from `assets/icons/logo.png`

Every launcher and splash asset is derived from the one brand mark by
`npm run generate:app-icons`, rather than being hand-exported. The mark is the
stub - the same rounded diagonal the cards use - with a cream `R`, and the
generator reads its colour out of the source rather than hardcoding one, so a
recoloured logo propagates.

Before this they were all Expo template defaults: the blue chevron icon, the
Expo logo as the splash image, `#E6F4FE` behind the adaptive icon, and plain
white/black splash grounds. Those now use `--color-background` from `global.css`
in both themes.

The interesting part is the upscale. The source is 256x256 and an app icon needs
1024, and three approaches were tried on screen:

1. **Threshold a bilinear sample.** Linear interpolation has a kink at every
   source pixel, so thresholding it turned the letter's bowl into a visible
   polygon.
2. **Threshold a Catmull-Rom sample.** Cubic is smooth, but it overshoots at a
   step edge, which notched the stub's straight sides.
3. **Threshold a signed distance field**, which is what `scripts/sdf.js` builds.
   A distance field has no step to ring on, so interpolating it and thresholding
   at zero reconstructs a smooth contour at any scale. Exact Euclidean distance
   via Felzenszwalb-Huttenlocher, run on the inside and the outside.

One trap worth keeping written down: the mark fills its own canvas, so its outer
edges are where the artwork was cropped, not where the shape ends. The field had
no "outside" to measure and reported the entire canvas as inside, which painted
the mark edge to edge. The masks are padded before the transform so every edge
is a real boundary.

Sizing is per platform rather than one image reused: 64% of the canvas for
iOS and web so it survives a circular mask, 52% for the Android adaptive
foreground because only the centre 66/108 of that layer is guaranteed visible,
and 86% for the splash, which the plugin scales to 200px over
`backgroundColor`. The Android themed layer fills the stub flat and knocks the
letter out, so the glyph still reads once the system tints the opaque area.

## The avatar fallback is a monogram, not a stock illustration

`user.imageUrl` from Clerk when there is one, otherwise the user's initials on an
accent ground - `components/Avatar.tsx`.

The fallback used to be a bundled illustration that shipped with the starter, a
stock character holding React and JS logos, rendered as *the signed-in user's
avatar* on Home and in Settings. A monogram can't be someone else's face, is
derived from the name already displayed beside it, and needs no asset at all.

The initials come from the same `displayName` the screens show, so an email
address contributes its first character rather than being split on dots into
something like "FL".
