import { create } from 'zustand';
import { HOME_SUBSCRIPTIONS } from '@/constants/data';

interface SubscriptionStore {
    subscriptions: Subscription[];
    addSubscription: (subscription: Subscription) => void;
    updateSubscription: (subscription: Subscription) => void;
    cancelSubscription: (id: string) => void;
}

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
    subscriptions: HOME_SUBSCRIPTIONS,

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
}));
