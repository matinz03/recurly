import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { type Currency } from '@/constants/currencies';

/**
 * The only lead times offered on the Settings screen. A closed set (rather
 * than a free-text number) keeps `lib/notifications.ts`'s reminder math and
 * the picker UI in sync with no separate validation step.
 */
export const REMINDER_LEAD_DAY_OPTIONS = [1, 2, 3, 7] as const;
export type ReminderLeadDays = (typeof REMINDER_LEAD_DAY_OPTIONS)[number];

// Matches the module constant lib/notifications.ts used before this store
// existed, so shipping this doesn't change anyone's reminder timing by default.
const DEFAULT_REMINDER_LEAD_DAYS: ReminderLeadDays = 2;
const DEFAULT_BASE_CURRENCY: Currency = 'USD';
const DEFAULT_REMINDERS_ENABLED = true;

interface PreferencesStore {
    // False until AsyncStorage has been read - see lib/subscriptionStore.ts's
    // identical field for why consumers (lib/notifications.ts via
    // lib/useRenewalReminders.ts) should gate on this rather than acting on
    // the default values as if they were the user's real choice.
    hasHydrated: boolean;
    remindersEnabled: boolean;
    reminderLeadDays: ReminderLeadDays;
    /** Every amount is entered and stored in this currency. */
    baseCurrency: Currency;
    setRemindersEnabled: (enabled: boolean) => void;
    setReminderLeadDays: (days: ReminderLeadDays) => void;
    setBaseCurrency: (currency: Currency) => void;
    // Resets in-memory state to defaults and wipes the persisted copy in one
    // call, so Settings' "Clear stored data" doesn't need to know the
    // defaults or reach into the persist API itself.
    resetPreferences: () => void;
}

interface PersistedPreferences {
    remindersEnabled: boolean;
    reminderLeadDays: ReminderLeadDays;
    /** Every amount is entered and stored in this currency. */
    baseCurrency: Currency;
}

// Same reasoning as lib/subscriptionStore.ts's noopStorage: `expo export`
// evaluates this module in Node (no `window`) to prerender routes, and
// AsyncStorage's web backend throws there. A no-op backend resolves
// hydration to "nothing persisted" instead of failing the whole build.
const noopStorage: StateStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
};

const storageBackend: StateStorage =
    Platform.OS === 'web' && typeof window === 'undefined' ? noopStorage : AsyncStorage;

// Captured from inside the creator so onRehydrateStorage can flip
// `hasHydrated` even when the read fails - see lib/subscriptionStore.ts's
// identical `setState` capture for the full reasoning.
let setState: ((partial: Partial<PreferencesStore>) => void) | undefined;

export const usePreferencesStore = create<PreferencesStore>()(
    persist(
        (set) => {
            setState = set;

            return {
                hasHydrated: false,
                remindersEnabled: DEFAULT_REMINDERS_ENABLED,
                reminderLeadDays: DEFAULT_REMINDER_LEAD_DAYS,
                baseCurrency: DEFAULT_BASE_CURRENCY,

                setRemindersEnabled: (enabled) => set({ remindersEnabled: enabled }),
                setReminderLeadDays: (days) => set({ reminderLeadDays: days }),
                setBaseCurrency: (currency) => set({ baseCurrency: currency }),

                // Writes the defaults rather than calling
                // persist.clearStorage(): that removes the key without
                // awaiting, so it races the write this set() triggers and the
                // final disk state depends on which lands last. Persisting the
                // defaults reaches the same end state in one ordered step.
                resetPreferences: () =>
                    set({
                        remindersEnabled: DEFAULT_REMINDERS_ENABLED,
                        reminderLeadDays: DEFAULT_REMINDER_LEAD_DAYS,
                        baseCurrency: DEFAULT_BASE_CURRENCY,
                    }),
            };
        },
        {
            name: 'preferences-store',
            storage: createJSONStorage(() => storageBackend),
            version: 1,

            // Actions and hasHydrated aren't data - only the real preference
            // values go to disk.
            partialize: (state): PersistedPreferences => ({
                remindersEnabled: state.remindersEnabled,
                reminderLeadDays: state.reminderLeadDays,
                baseCurrency: state.baseCurrency,
            }),

            // No shape has shipped before version 1 - see
            // lib/subscriptionStore.ts's identical seam for what a future
            // bump should do here instead of crashing or discarding old data.
            migrate: (persistedState) => persistedState as PersistedPreferences,

            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.warn('[preferencesStore] failed to rehydrate preferences:', error);
                }
                setState?.({ hasHydrated: true });
            },
        }
    )
);
