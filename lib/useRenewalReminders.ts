import { useEffect } from 'react';
import { configureNotificationHandler, scheduleRenewalReminders } from '@/lib/notifications';
import { usePreferencesStore } from '@/lib/preferencesStore';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

/**
 * Wires renewal reminders to the subscription store *and* the preferences
 * store from outside both, via `.subscribe`, rather than adding a
 * reminder-scheduling call inside either store's actions - a store's job is
 * holding state, not side-effecting on it.
 *
 * Both stores start out hydrating, and `scheduleRenewalReminders` reads the
 * lead time and on/off switch straight from the preferences store itself
 * (see lib/notifications.ts) - so this only needs to know when to *call* it,
 * not what to pass beyond the subscription list. Skipping every emission
 * until both have hydrated avoids scheduling against seed data or default
 * preferences nobody actually chose, then immediately again once the real
 * values land.
 *
 * Subscribing to the preferences store as well as the subscription store is
 * what makes changing the lead time or flipping the master switch on
 * Settings take effect right away - without it, the old schedule would stick
 * around until the next unrelated subscription edit happened to reschedule
 * everything, which would look like the setting did nothing.
 */
export const useRenewalReminders = (): void => {
    useEffect(() => {
        configureNotificationHandler();

        const reschedule = () => {
            const { hasHydrated, subscriptions } = useSubscriptionStore.getState();
            if (!hasHydrated) return;
            if (!usePreferencesStore.getState().hasHydrated) return;
            void scheduleRenewalReminders(subscriptions);
        };

        reschedule();

        const unsubscribeSubscriptions = useSubscriptionStore.subscribe(reschedule);
        const unsubscribePreferences = usePreferencesStore.subscribe(reschedule);

        return () => {
            unsubscribeSubscriptions();
            unsubscribePreferences();
        };
    }, []);
};
