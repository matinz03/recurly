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
in history and the status breakdown while dropping out of spend totals.
Destructive delete is a separate, still-missing action.
