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

        expect(persisted.state).toEqual({ remindersEnabled: false, reminderLeadDays: 3 });
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
    // it should undo both the in-memory values and the disk copy.
    it('resetPreferences restores defaults and clears the persisted copy', async () => {
        const useStore = loadStore();
        useStore.getState().setRemindersEnabled(false);
        useStore.getState().setReminderLeadDays(7);
        await flush();
        expect(await readPersisted()).not.toBeNull();

        useStore.getState().resetPreferences();
        await flush();

        const { remindersEnabled, reminderLeadDays } = useStore.getState();
        expect(remindersEnabled).toBe(true);
        expect(reminderLeadDays).toBe(2);
        expect(await readPersisted()).toBeNull();
    });
});
