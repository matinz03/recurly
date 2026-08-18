# Data model

One entity, one list, two persisted stores. Everything on screen is derived from
this at render time — nothing derived is stored.

## `Subscription`

Declared globally in [`type.d.ts`](../type.d.ts), so it needs no import.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Client-generated. Stable across edits; the store keys on it. |
| `name` | `string` | Required. Also drives icon matching. |
| `price` | `number` | In `currency`, per `billing` period. |
| `billing` | `string` | `'Monthly'` or `'Yearly'`. Compared case-insensitively, and anything unrecognised is treated as monthly. |
| `currency` | `string?` | Absent means USD. Set from the base currency when the record is created. |
| `icon` | `ImageSourcePropType \| string` | Bundled asset, or raw SVG markup. See below. |
| `status` | `SubscriptionStatus?` | `'active' \| 'paused' \| 'cancelled'`. Absent behaves as not-active. |
| `renewalDate` | `string?` | ISO. Goes stale — never display it directly. |
| `startDate` | `string?` | ISO. When the user first subscribed; display only. |
| `plan` | `string?` | Tier name, e.g. "Premium Duo". |
| `category` | `string?` | One of `CATEGORIES`, or a legacy/imported value. |
| `paymentMethod` | `string?` | `"<label> ending in <4 digits>"`, or just the label. |
| `color` | `string?` | The light-theme category colour, persisted at creation. |

### Three fields that carry rules

**`icon` is a union.** A bundled PNG resolves to a module id; a match from the
generated simple-icons subset is raw SVG markup. Rendering it with a bare
`<Image source={icon}>` breaks the string case — always use
[`components/SubscriptionIcon.tsx`](../components/SubscriptionIcon.tsx). The
union is also why persistence stores a discriminator instead of the value.

**`renewalDate` is an anchor, not an answer.** A monthly plan whose stored date
was in March has renewed several times since. Every "next renewal" reads
`nextRenewalDate(renewalDate, billing)`, which rolls the date forward by the
billing period until it lands in the future, and returns `null` if the stored
date is so old it must be wrong (capped at 600 periods).

**`color` is data, not theme.** It holds the light-theme value, which a `dark:`
variant can't reach. Cards derive their colour from `category` at render time via
`useCategoryColor()`, and fall back to `color` only when the category isn't one
of ours — an import, or a category since renamed.

### `status`

| Status | Counts toward spend | Shows in Upcoming | Reminders |
| --- | --- | --- | --- |
| `active` | yes | yes | yes |
| `paused` | no | no | no |
| `cancelled` | no | no | no |

Cancelling **marks** a subscription; it never deletes it. The record is the
history of what you used to pay for, and deleting it silently would lose that.
Delete is a separate, explicitly destructive action.

Statuses are compared with `.toLowerCase()` throughout, and deliberately not with
`=== 'active'`. The type narrowed to lowercase after records had already been
persisted, so an exact comparison would silently drop a stored `'Active'` out of
every total and out of Upcoming - the opposite of what the rule is for.

## Persistence

Two zustand stores, both `persist`ed to AsyncStorage:

| Store | Holds |
| --- | --- |
| [`lib/subscriptionStore.ts`](../lib/subscriptionStore.ts) | the subscription list |
| [`lib/preferencesStore.ts`](../lib/preferencesStore.ts) | reminders on/off, reminder lead days, base currency, theme preference |

Both follow the same three rules:

- **`partialize` persists data only.** Actions and `hasHydrated` are not data.
  Which card is expanded isn't either — that's local UI state, owned by
  [`lib/useExpandedSubscription.ts`](../lib/useExpandedSubscription.ts).
- **`hasHydrated` flips on rehydrate, including on failure.** Screens gate on it;
  a store that never reported hydration would leave the app on a spinner forever.
- **Clearing writes an empty/default state rather than removing the key.**
  `clearStorage()` isn't awaitable, so it races the next write and can resurrect
  the seed list.

`version` is set on both stores with a `migrate` seam already wired, so a future
shape change transforms old data instead of crashing on it or silently dropping
it.

### The icon round trip

`icon` can't be persisted as-is. A bundled `require()` returns a module id that
Metro is free to renumber between builds, so a stored id can resolve to a
different image — or to nothing — after a rebuild. Icons are written as
`{ kind: 'bundled', key }` or `{ kind: 'svg', markup }` and resolved back through
`ICON_TO_KEY` on read. An unknown key falls back rather than crashing.

## Seed data

`constants/data.ts` holds `HOME_SUBSCRIPTIONS`, used **only** as the store's
initial state. No screen reads it. A screen that renders before `hasHydrated` is
showing seed data to a real user, which is the bug that rule exists to prevent.
