import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'preferences-store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Same isolation reasoning as lib/__tests__/subscriptionStore.test.ts: the
 * store is a singleton that reads persisted state once at import time, so
 * each test needs a fresh module registry rather than sharing one across the
 * whole file.
 */
const loadStore = () => {
    let store: typeof import('@/lib/preferencesStore');
    jest.isolateModules(() => {
        store = require('@/lib/preferencesStore');
    });
    return store!.usePreferencesStore;
};

const readPersisted = async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
};

beforeEach(async () => {
    await AsyncStorage.clear();
});

describe('defaults', () => {
    it('starts reminders on with a 2-day lead time', () => {
        const useStore = loadStore();
        const { remindersEnabled, reminderLeadDays } = useStore.getState();

        expect(remindersEnabled).toBe(true);
        expect(reminderLeadDays).toBe(2);
    });
});

describe('hydration flag', () => {
    it('flips to true once hydration settles', async () => {
        const useStore = loadStore();
        await useStore.persist.rehydrate();

        expect(useStore.getState().hasHydrated).toBe(true);
    });
});

describe('setting values', () => {
    it('flips the reminders master switch', () => {
        const useStore = loadStore();

        useStore.getState().setRemindersEnabled(false);
        expect(useStore.getState().remindersEnabled).toBe(false);

        useStore.getState().setRemindersEnabled(true);
        expect(useStore.getState().remindersEnabled).toBe(true);
    });

    it('changes the reminder lead time', () => {
        const useStore = loadStore();

        useStore.getState().setReminderLeadDays(7);

        expect(useStore.getState().reminderLeadDays).toBe(7);
    });
});

describe('persisted round trip', () => {
    it('writes the chosen values to disk, not the defaults', async () => {
        const useStore = loadStore();
        useStore.getState().setRemindersEnabled(false);
        useStore.getState().setReminderLeadDays(3);
        await flush();

        const persisted = await readPersisted();

        expect(persisted.state).toEqual({
            remindersEnabled: false,
            reminderLeadDays: 3,
            baseCurrency: 'USD',
            themePreference: 'system',
        });
    });

    // The light/system/dark choice has to outlive a relaunch, or the app snaps
    // back to following the OS every cold start.
    it('persists the chosen appearance', async () => {
        const useStore = loadStore();
        expect(useStore.getState().themePreference).toBe('system');

        useStore.getState().setThemePreference('dark');
        await flush();

        expect((await readPersisted()).state.themePreference).toBe('dark');
    });

    // Amounts are entered in this currency rather than each subscription
    // carrying its own, so it has to survive a relaunch like the rest.
    it('persists the chosen base currency', async () => {
        const useStore = loadStore();
        expect(useStore.getState().baseCurrency).toBe('USD');

        useStore.getState().setBaseCurrency('EUR');
        await flush();

        expect(useStore.getState().baseCurrency).toBe('EUR');
        expect((await readPersisted()).state.baseCurrency).toBe('EUR');
    });

    it('rehydrates persisted values back into state', async () => {
        await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: 1,
                state: { remindersEnabled: false, reminderLeadDays: 1 },
            })
        );

        const useStore = loadStore();
        await useStore.persist.rehydrate();

        const { remindersEnabled, reminderLeadDays } = useStore.getState();
        expect(remindersEnabled).toBe(false);
        expect(reminderLeadDays).toBe(1);
    });

    // resetPreferences is the only way Settings can reset this store without
    // subscriptionStore.ts-style store-file changes being needed here too -
    // Reset writes the defaults to disk rather than removing the key. Removing
    // it can't be sequenced against the write that set() triggers - see
    // resetPreferences - and a missing key would rehydrate to defaults anyway,
    // so persisting them reaches the same place deterministically.
    it('resetPreferences restores defaults and persists them', async () => {
        const useStore = loadStore();
        useStore.getState().setRemindersEnabled(false);
        useStore.getState().setReminderLeadDays(7);
        await flush();
        expect((await readPersisted()).state.remindersEnabled).toBe(false);

        useStore.getState().resetPreferences();
        await flush();

        const { remindersEnabled, reminderLeadDays } = useStore.getState();
        expect(remindersEnabled).toBe(true);
        expect(reminderLeadDays).toBe(2);

        // The defaults survive a reload, rather than a stale non-default value.
        const persisted = await readPersisted();
        expect(persisted.state.remindersEnabled).toBe(true);
        expect(persisted.state.reminderLeadDays).toBe(2);
    });
});
