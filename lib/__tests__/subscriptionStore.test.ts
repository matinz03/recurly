import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'subscription-store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The store is a singleton that reads persisted state once at import time, so
 * each test needs a fresh module registry. `icons` has to come from that same
 * registry: the store maps a bundled icon back to its key by object identity,
 * and a second copy of constants/icons would hold different objects.
 */
const loadStore = () => {
    let store: typeof import('@/lib/subscriptionStore');
    let iconModule: typeof import('@/constants/icons');
    jest.isolateModules(() => {
        store = require('@/lib/subscriptionStore');
        iconModule = require('@/constants/icons');
    });
    return { useStore: store!.useSubscriptionStore, icons: iconModule!.icons };
};

const subscription = (
    icon: Subscription['icon'],
    overrides: Partial<Subscription> = {}
): Subscription => ({
    id: 'new',
    icon,
    name: 'New',
    price: 5,
    billing: 'Monthly',
    status: 'active',
    ...overrides,
});

const readPersisted = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
};

beforeEach(async () => {
    await AsyncStorage.clear();
});

describe('icon persistence', () => {
    // A bundled icon is a Metro asset reference, only valid for the bundle that
    // produced it. Writing one to disk would resolve to the wrong asset (or
    // nothing) after the next build, so it must be stored as a stable key.
    it('stores a bundled icon as its key, never the raw asset reference', async () => {
        const { useStore, icons } = loadStore();
        useStore.getState().addSubscription(subscription(icons.netflix, { id: 'nf' }));
        await flush();

        const persisted = await readPersisted();
        const stored = persisted.state.subscriptions.find((s: any) => s.id === 'nf');

        expect(stored.icon).toEqual({ kind: 'bundled', key: 'netflix' });
        expect(typeof stored.icon).not.toBe('number');
    });

    it('stores a matched SVG icon as its markup', async () => {
        const markup = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
        const { useStore } = loadStore();
        useStore.getState().addSubscription(subscription(markup, { id: 'svg' }));
        await flush();

        const persisted = await readPersisted();
        const stored = persisted.state.subscriptions.find((s: any) => s.id === 'svg');

        expect(stored.icon).toEqual({ kind: 'svg', markup });
    });

    it('rehydrates both icon kinds back to renderable values', async () => {
        const markup = '<svg viewBox="0 0 24 24"><path d="M1 1h1v1H1z"/></svg>';
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: 1,
                state: {
                    subscriptions: [
                        { ...subscription(0, { id: 'nf' }), icon: { kind: 'bundled', key: 'netflix' } },
                        { ...subscription(0, { id: 'svg' }), icon: { kind: 'svg', markup } },
                    ],
                },
            })
        );

        const { useStore, icons } = loadStore();
        await useStore.persist.rehydrate();

        const { subscriptions } = useStore.getState();
        expect(subscriptions.find((s) => s.id === 'nf')!.icon).toBe(icons.netflix);
        expect(subscriptions.find((s) => s.id === 'svg')!.icon).toBe(markup);
    });
});

describe('hydration flag', () => {
    it('flips to true once hydration settles', async () => {
        const { useStore } = loadStore();
        await useStore.persist.rehydrate();

        expect(useStore.getState().hasHydrated).toBe(true);
    });
});

describe('mutations', () => {
    it('prepends new subscriptions and keeps existing ones', () => {
        const { useStore, icons } = loadStore();
        const before = useStore.getState().subscriptions.length;

        useStore.getState().addSubscription(subscription(icons.plus, { id: 'added' }));

        const { subscriptions } = useStore.getState();
        expect(subscriptions).toHaveLength(before + 1);
        expect(subscriptions[0].id).toBe('added');
    });

    it('replaces a subscription by id on update', () => {
        const { useStore, icons } = loadStore();
        useStore.getState().addSubscription(subscription(icons.plus, { id: 'edit-me', name: 'Before' }));

        useStore.getState().updateSubscription(subscription(icons.plus, { id: 'edit-me', name: 'After' }));

        const match = useStore.getState().subscriptions.filter((s) => s.id === 'edit-me');
        expect(match).toHaveLength(1);
        expect(match[0].name).toBe('After');
    });

    // Cancelling keeps the record so it stays in history and the status
    // breakdown - it must not remove the row.
    it('marks cancelled without deleting the record', () => {
        const { useStore, icons } = loadStore();
        useStore.getState().addSubscription(subscription(icons.plus, { id: 'bye', status: 'active' }));
        const before = useStore.getState().subscriptions.length;

        useStore.getState().cancelSubscription('bye');

        const { subscriptions } = useStore.getState();
        expect(subscriptions).toHaveLength(before);
        expect(subscriptions.find((s) => s.id === 'bye')!.status).toBe('cancelled');
    });

    // Delete is the one action in this store that actually removes a row -
    // unlike cancel/pause/resume, which only ever rewrite `status`.
    it('removes the record entirely on delete', () => {
        const { useStore, icons } = loadStore();
        useStore.getState().addSubscription(subscription(icons.plus, { id: 'gone' }));
        const before = useStore.getState().subscriptions.length;

        useStore.getState().deleteSubscription('gone');

        const { subscriptions } = useStore.getState();
        expect(subscriptions).toHaveLength(before - 1);
        expect(subscriptions.find((s) => s.id === 'gone')).toBeUndefined();
    });

    it('sets status for pause and resume alike, keeping the record and list length', () => {
        const { useStore, icons } = loadStore();
        useStore.getState().addSubscription(subscription(icons.plus, { id: 'toggle', status: 'active' }));
        const before = useStore.getState().subscriptions.length;

        useStore.getState().setSubscriptionStatus('toggle', 'paused');

        let { subscriptions } = useStore.getState();
        expect(subscriptions).toHaveLength(before);
        expect(subscriptions.find((s) => s.id === 'toggle')!.status).toBe('paused');

        useStore.getState().setSubscriptionStatus('toggle', 'active');

        subscriptions = useStore.getState().subscriptions;
        expect(subscriptions).toHaveLength(before);
        expect(subscriptions.find((s) => s.id === 'toggle')!.status).toBe('active');
    });
});
