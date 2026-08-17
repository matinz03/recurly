import { useEffect } from 'react';
import { configureNotificationHandler, scheduleRenewalReminders } from '@/lib/notifications';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

/**
 * Wires renewal reminders to the subscription store from outside it, via
 * `useSubscriptionStore.subscribe`, rather than adding a reminder-scheduling
 * call inside a store action - the store's job is holding state, not
 * side-effecting on it.
 *
 * Skips every emission until `hasHydrated` flips: the store starts out
 * holding the seed list, and scheduling against that would fire once for
 * data nobody has, then immediately again for the real (or empty) list once
 * AsyncStorage resolves.
 */
export const useRenewalReminders = (): void => {
    useEffect(() => {
        configureNotificationHandler();

        const runIfHydrated = (state: ReturnType<typeof useSubscriptionStore.getState>) => {
            if (!state.hasHydrated) return;
            void scheduleRenewalReminders(state.subscriptions);
        };

        runIfHydrated(useSubscriptionStore.getState());

        return useSubscriptionStore.subscribe(runIfHydrated);
    }, []);
};
