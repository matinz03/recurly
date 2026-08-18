import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { HOME_SUBSCRIPTIONS } from '@/constants/data';
import { icons, type IconKey } from '@/constants/icons';

interface SubscriptionStore {
    subscriptions: Subscription[];
    // False until AsyncStorage has been read and `subscriptions` reflects
    // what's actually on disk. Before that it's still the seed list from
    // below - screens that want to avoid flashing seed data as if it were
    // real should gate on this rather than assuming the first render is final.
    hasHydrated: boolean;
    addSubscription: (subscription: Subscription) => void;
    updateSubscription: (subscription: Subscription) => void;
    cancelSubscription: (id: string) => void;
    // Destructive and unrecoverable - there is no undo, so callers must gate
    // this behind their own confirmation (subscriptions.tsx does).
    deleteSubscription: (id: string) => void;
    // Shared by pause and resume: both are just a status write, so the UI
    // decides which direction makes sense from the record's current status.
    setSubscriptionStatus: (id: string, status: SubscriptionStatus) => void;
}

// ---------------------------------------------------------------------------
// Icon persistence
//
// `Subscription.icon` is `ImageSourcePropType | string`: either a bundled PNG
// from constants/icons.ts (Metro resolves the `require()` to a numeric module
// id) or raw SVG markup from matchSubscriptionIcon's simple-icons fallback.
// The SVG case is already a plain string, so it round-trips through
// AsyncStorage untouched. The bundled-PNG case does not: a module id is only
// stable for the lifetime of the current JS bundle, so a number written to
// disk today can resolve to an unrelated asset - or nothing - after the next
// build. It would look fine until the first rebuild, then quietly show wrong
// icons for every stored subscription.
//
// So the real `icon` value never reaches disk. It's swapped for a
// serializable discriminator - the `IconKey` it came from, for bundled art,
// or the markup string itself for SVGs - via `partialize`, and swapped back
// via `merge` once the persisted blob comes back.
type PersistedIcon =
    | { kind: 'bundled'; key: IconKey }
    | { kind: 'svg'; markup: string };

type PersistedSubscription = Omit<Subscription, 'icon'> & { icon: PersistedIcon };

interface PersistedState {
    subscriptions: PersistedSubscription[];
}

// Reverse lookup from a bundled icon's resolved value back to the key it was
// stored under, built once from the same `icons` object every bundled icon on
// a Subscription comes from (constants/icons.ts, via matchSubscriptionIcon or
// the HOME_SUBSCRIPTIONS seed) - so there's no second list of keys to keep in
// sync by hand.
const ICON_TO_KEY = new Map<Subscription['icon'], IconKey>(
    (Object.entries(icons) as [IconKey, Subscription['icon']][]).map(([key, value]) => [value, key])
);

const serializeIcon = (icon: Subscription['icon']): PersistedIcon => {
    if (typeof icon === 'string') return { kind: 'svg', markup: icon };
    const key = ICON_TO_KEY.get(icon);
    // Every icon on a Subscription in this app comes from one of the two
    // branches above - there is no third source - so a missing key would mean
    // an icon value that was never a member of `icons`. Falling back to
    // `plus` (the same fallback CreateSubscriptionModal uses for a name that
    // matches nothing) loses that one icon instead of crashing hydration for
    // every subscription in the store.
    return { kind: 'bundled', key: key ?? 'plus' };
};

const deserializeIcon = (icon: PersistedIcon): Subscription['icon'] =>
    icon.kind === 'svg' ? icon.markup : icons[icon.key];

const serializeSubscriptions = (subscriptions: Subscription[]): PersistedSubscription[] =>
    subscriptions.map(({ icon, ...rest }) => ({ ...rest, icon: serializeIcon(icon) }));

const deserializeSubscriptions = (subscriptions: PersistedSubscription[]): Subscription[] =>
    subscriptions.map(({ icon, ...rest }) => ({ ...rest, icon: deserializeIcon(icon) }));

// On web, AsyncStorage is backed by window.localStorage. `app.json` sets
// `web.output: "static"`, so `expo export` evaluates this module in Node to
// prerender the routes - where there is no `window`, and every AsyncStorage
// call throws `ReferenceError: window is not defined`, failing the build. Fall
// back to a no-op backend there: prerendering has no user data to restore, so
// hydration should resolve to "nothing persisted" rather than crash.
const noopStorage: StateStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
};

const storageBackend: StateStorage =
    Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

// Captured from inside the creator below so `onRehydrateStorage` can flip
// `hasHydrated` on the real store. zustand calls that callback with the live
// state on a successful hydration but with no state at all on a failed one
// (see the `error` branch), so reaching for a captured `set` - rather than an
// action on `state` - is what lets `hasHydrated` still flip after a read
// failure instead of leaving screens waiting on it forever.
let setState: ((partial: Partial<SubscriptionStore>) => void) | undefined;

export const useSubscriptionStore = create<SubscriptionStore>()(
    persist(
        (set) => {
            setState = set;

            return {
                subscriptions: HOME_SUBSCRIPTIONS,
                hasHydrated: false,

                addSubscription: (subscription) =>
                    set((state) => ({ subscriptions: [subscription, ...state.subscriptions] })),

                updateSubscription: (subscription) =>
                    set((state) => ({
                        subscriptions: state.subscriptions.map((existing) =>
                            existing.id === subscription.id ? subscription : existing
                        ),
                    })),

                // Cancelling keeps the record so it still shows in history and in the
                // status breakdown; it just stops counting toward spend.
                cancelSubscription: (id) =>
                    set((state) => ({
                        subscriptions: state.subscriptions.map((existing) =>
                            existing.id === id ? { ...existing, status: 'cancelled' } : existing
                        ),
                    })),

                // Unlike cancel/pause/resume, this actually removes the row -
                // it's the only action in this store that does.
                deleteSubscription: (id) =>
                    set((state) => ({
                        subscriptions: state.subscriptions.filter((existing) => existing.id !== id),
                    })),

                setSubscriptionStatus: (id, status) =>
                    set((state) => ({
                        subscriptions: state.subscriptions.map((existing) =>
                            existing.id === id ? { ...existing, status } : existing
                        ),
                    })),
            };
        },
        {
            name: 'subscription-store',
            storage: createJSONStorage(() => storageBackend),
            version: 1,

            // Actions aren't data, and `hasHydrated` only means anything for the
            // current session - only `subscriptions` goes to disk, and only
            // after its icons are swapped for their serializable form above.
            partialize: (state): PersistedState => ({
                subscriptions: serializeSubscriptions(state.subscriptions),
            }),

            // No shape has ever shipped before version 1, so there's nothing to
            // translate yet. This is the seam a future Subscription change
            // hooks into - bump `version`, transform the old `persistedState`
            // into the new shape here - instead of the store crashing on old
            // data or silently discarding it.
            migrate: (persistedState) => persistedState as PersistedState,

            // The default merge is a shallow `{...currentState, ...persistedState}`,
            // which would overwrite `subscriptions` with the still-serialized
            // form (icons as `PersistedIcon` objects, not real ones) and hand
            // that straight to screens. Deserialize first, then layer over
            // `currentState` so the actions - stripped out by `partialize`
            // before anything reached disk - survive the swap.
            merge: (persistedState, currentState) => {
                const persisted = persistedState as PersistedState | null | undefined;
                if (!persisted?.subscriptions) return currentState;
                return {
                    ...currentState,
                    subscriptions: deserializeSubscriptions(persisted.subscriptions),
                };
            },

            // Fires once hydration settles, success or failure, so `hasHydrated`
            // always eventually flips - a screen gating on it should never spin
            // forever just because the device had nothing persisted yet, or the
            // AsyncStorage read itself failed.
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.warn('[subscriptionStore] failed to rehydrate persisted subscriptions:', error);
                }
                setState?.({ hasHydrated: true });
            },
        }
    )
);
