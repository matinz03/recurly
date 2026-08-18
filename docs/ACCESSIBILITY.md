# Accessibility

What's deliberate, and what to preserve when changing these screens. None of it
is verified with a real screen reader — see [Not verified](#not-verified) at the
end, and don't claim otherwise.

## Composed labels, not fragments

A subscription card's head row is a single accessible element that announces
name, price, cadence and category as one phrase. Left as four separate `Text`
nodes, a screen reader reads four disconnected fragments and the user has to
reassemble the row themselves.

The same applies to the Upcoming carousel and the Insights rows: the row is the
unit of meaning, so the row carries the label.

## The card's expand toggle is the head row

Expanding a card is a `Pressable` on the head row rather than on the whole card.
That matters because the body holds its own action buttons — Edit, Pause, Cancel,
Delete. A card-wide toggle would nest those buttons inside a pressable ancestor,
and they stop being individually reachable.

While collapsed, the body is still mounted (the animation measures it), so it is
explicitly removed from assistive tech and from touch:

```tsx
accessibilityElementsHidden={!expanded}
importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
pointerEvents={expanded ? 'auto' : 'none'}
```

Drop any one of those and a screen reader reads rows that aren't visible, or taps
land on invisible buttons.

## Touch targets

44pt minimum. Where the visual element is smaller — the inline "Sign up" link on
the auth screens, the small chevrons — the target is grown with `hitSlop` rather
than padding, so the layout doesn't shift to accommodate it.

The card's `hitSlop` drops its bottom edge when expanded, so the toggle's target
doesn't overlap the first action button underneath it.

`.detail-link-row` and `.detail-link-button` exist for the same reason in
reverse: the row is the layout, the button is the target. They were one element,
and tapping anywhere in that horizontal band triggered it — including the far
side of the screen, well away from anything that looked pressable.

## Roles and state

- Status filters and the Settings pickers are `radiogroup` + `radio`, with
  `accessibilityState={{ selected }}`. Without the state, every option announces
  identically and the current one is unknowable.
- Icon-only controls carry `accessibilityLabel` and hide their inner `Image`
  (`accessibilityElementsHidden`), or the label is announced and then the
  unlabelled image is announced again.
- `ConfirmDialog` sets `accessibilityViewIsModal`, so focus can't wander into the
  screen behind it.

## Hydration is announced, not just spun

Screens gate their content on `hasHydrated` and show a spinner. A spinner
resolving into content isn't a navigation event, so nothing would otherwise tell
a screen reader the wait is over. Each gated screen carries a visually hidden
`accessibilityLiveRegion="polite"` `Text` that changes when the data lands.

Hidden means positioned off-screen, **not** `display: none` — `display: none`
drops the node from the accessibility tree entirely, which defeats the point.

Caveat: iOS VoiceOver largely ignores `accessibilityLiveRegion`, so this is a
partial fix, effective on Android TalkBack.

## Motion and haptics

- The expand animation honours reduce-motion via `ReduceMotion.System`.
- Haptics fire on **outcomes**, not on intent: a save that succeeded, a
  destructive action that went through. Firing on every tap makes the signal
  meaningless.

## Contrast

Card ink is chosen from the card's own colour, not from the theme, using
`isLightColor` (WCAG relative luminance, thresholded near the midpoint). A
subscription whose category isn't one of ours falls back to its persisted
light-theme colour even in dark mode, so a theme-only rule painted light text on
a pale ground.

`lib/__tests__/guards.test.ts` asserts every category colour still sits on the
expected side of that threshold, so retuning a palette value can't silently break
card contrast.

The dark palette was tuned to clear 7:1 for ivory ink on every category surface,
and the light washes carry dark ink. The `muted` token is deliberately light in
both themes because fixed dark-navy glyphs sit on it and need 3:1.

## Not verified

No screen-reader pass has been run on device — not VoiceOver, not TalkBack — and
no automated a11y checks run in CI. Everything above is reasoning about the API,
which is exactly the kind of thing that turns out to be wrong on hardware. Font
scaling at large accessibility text sizes is also untested; several rows are
fixed-height and are likely to clip.
