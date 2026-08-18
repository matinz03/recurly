import "@/global.css"
import {FlatList, Image, Text, View} from "react-native";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";
import { styled } from "nativewind";
import images from "@/constants/images";
import {daysUntil, formatCurrency, nextRenewalDate, totalsByCurrency} from "@/lib/utils";
import dayjs from "dayjs";
import ListHeading from "@/components/ListHeading";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import AddSubscriptionButton from "@/components/AddSubscriptionButton";
import HydrationGate from "@/components/HydrationGate";
import EmptySubscriptions from "@/components/EmptySubscriptions";
import {useMemo, useState} from "react";
import { useRouter } from "expo-router";
import { useUser } from '@clerk/expo';
import { notifySuccess } from "@/lib/haptics";
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { useExpandedSubscription } from "@/lib/useExpandedSubscription";
const SafeAreaView = styled(RNSafeAreaView);

/** How many renewals the Upcoming carousel shows. */
const UPCOMING_LIMIT = 5;

/** Stable reference so the hydration fallback can't bust useMemo deps. */
const NO_SUBSCRIPTIONS: Subscription[] = [];

/** Off-screen, not display:none - display:none would drop it from the
    accessibility tree entirely, defeating the live region below. */
const SR_ONLY = { position: 'absolute' as const, top: -9999, left: -9999, width: 1, height: 1, opacity: 0 };

export default function App() {
    const { user } = useUser();
    const router = useRouter();
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const { subscriptions: stored, addSubscription, hasHydrated } = useSubscriptionStore();

    // Until AsyncStorage resolves, `stored` is still the seed list - rendering it
    // would show a returning user four subscriptions they don't own.
    const subscriptions = hasHydrated ? stored : NO_SUBSCRIPTIONS;
    const { expandedId, toggleExpanded } = useExpandedSubscription();

    // Get user display name: firstName, fullName, or email
    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';

    // Derived from the store rather than a static list, so anything created or
    // edited shows up here immediately. Cancelled plans won't renew, so they're
    // excluded. Rather than a fixed window (which is empty whenever nothing
    // renews that week) this shows the soonest few renewals.
    const upcoming = useMemo(() => {
        return subscriptions
            .filter((subscription) => subscription.status?.toLowerCase() !== 'cancelled')
            .flatMap((subscription) => {
                const next = nextRenewalDate(subscription.renewalDate, subscription.billing);
                if (!next) return [];
                return [{
                    id: subscription.id,
                    icon: subscription.icon,
                    name: subscription.name,
                    price: subscription.price,
                    currency: subscription.currency,
                    daysLeft: daysUntil(next),
                    renewsAt: next.valueOf(),
                }];
            })
            .sort((a, b) => a.renewsAt - b.renewsAt)
            .slice(0, UPCOMING_LIMIT);
    }, [subscriptions]);

    // Committed monthly spend across everything still active, one entry per
    // currency so amounts are never summed across currencies (see
    // docs/DECISIONS.md). Sorted by size, so [0] is the currency to feature.
    const currencyTotals = useMemo(() => totalsByCurrency(subscriptions), [subscriptions]);
    const dominantTotal = currencyTotals[0];
    const otherTotals = currencyTotals.slice(1);

    const nextRenewal = upcoming[0];

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
                {/* Visually hidden - the hydration spinner resolving into real
                    content isn't a navigation event, so nothing would otherwise
                    tell a screen reader the wait is over. Android's TalkBack
                    announces the new text; iOS VoiceOver largely ignores
                    accessibilityLiveRegion, so this is a partial fix. */}
                <Text accessibilityLiveRegion="polite" style={SR_ONLY}>
                    {hasHydrated ? 'Subscriptions loaded' : 'Loading your subscriptions'}
                </Text>

                <FlatList
                    // An element, not a function: a new function identity each
                    // render would remount the whole header and reset the
                    // Upcoming carousel's scroll position.
                    ListHeaderComponent={
                        <>
                            <View className="home-header">
                                <View className="home-user">
                                    <Image
                                        source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                                        className="home-avatar"
                                    />
                                    <Text className="home-user-name">{displayName}</Text>
                                </View>
                            </View>

                            <View className="home-balance-card">
                                <Text className="home-balance-label">Monthly spend</Text>

                                <View className="home-balance-row">
                                    <Text className="home-balance-amount">
                                        {formatCurrency(dominantTotal?.monthly ?? 0, dominantTotal?.currency)}
                                    </Text>
                                    <Text className="home-balance-date">
                                        {nextRenewal ? dayjs(nextRenewal.renewsAt).format('MM/DD') : '--'}
                                    </Text>
                                </View>

                                {/* Only present with more than one active currency, so the
                                    single-currency card (the normal case) is unchanged. */}
                                {otherTotals.length > 0 && (
                                    <Text className="home-balance-secondary">
                                        + {otherTotals.map((total) => formatCurrency(total.monthly, total.currency)).join(' · ')}
                                    </Text>
                                )}
                            </View>

                            <View className="mb-5">
                                <ListHeading
                                    title="Upcoming"
                                    onPress={() => router.push('/(tabs)/subscriptions?sort=renewal')}
                                />

                                <FlatList
                                    data={upcoming}
                                    renderItem={({ item }) => (<UpcomingSubscriptionCard {...item} />)}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    ListEmptyComponent={hasHydrated ? <Text className="home-empty-state">No upcoming renewals yet.</Text> : null}
                                />
                            </View>

                            <ListHeading
                                title="All Subscriptions"
                                onPress={() => router.push('/(tabs)/subscriptions')}
                            />
                        </>
                    }
                    data={subscriptions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <SubscriptionCard
                            {...item}
                            expanded={expandedId === item.id}
                            onPress={() => toggleExpanded(item.id)}
                        />
                    )}
                    extraData={expandedId}
                    ItemSeparatorComponent={() => <View className="h-4" />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={hasHydrated ? <EmptySubscriptions onAddPress={() => setIsCreateModalVisible(true)} /> : <HydrationGate />}
                    contentContainerClassName="pb-30"
                />

                <AddSubscriptionButton onPress={() => setIsCreateModalVisible(true)} />

                <CreateSubscriptionModal
                    visible={isCreateModalVisible}
                    existingSubscriptions={subscriptions}
                    onClose={() => setIsCreateModalVisible(false)}
                    onSubmit={(subscription) => { addSubscription(subscription); notifySuccess(); }}
                />
        </SafeAreaView>
    );
}
