import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { styled } from "nativewind";
import { Feather } from '@expo/vector-icons';
import { colors } from "@/constants/theme";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import AddSubscriptionButton from "@/components/AddSubscriptionButton";
import HydrationGate from "@/components/HydrationGate";
import EmptySubscriptions from "@/components/EmptySubscriptions";
import { nextRenewalDate } from "@/lib/utils";
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { useExpandedSubscription } from "@/lib/useExpandedSubscription";

const SafeAreaView = styled(RNSafeAreaView);

type StatusFilter = 'all' | SubscriptionStatus;

/** Stable reference so the hydration fallback can't bust useMemo deps. */
const NO_SUBSCRIPTIONS: Subscription[] = [];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'cancelled', label: 'Cancelled' },
];

const Subscriptions = () => {
    // Set by Home's "View all" on the Upcoming heading.
    const { sort } = useLocalSearchParams<{ sort?: string }>();
    const router = useRouter();

    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [editing, setEditing] = useState<Subscription | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const {
        subscriptions: stored,
        hasHydrated,
        addSubscription,
        updateSubscription,
        cancelSubscription,
        deleteSubscription,
        setSubscriptionStatus,
    } = useSubscriptionStore();
    const { expandedId, toggleExpanded } = useExpandedSubscription();

    // Until AsyncStorage resolves, `stored` is still the seed list - filtering
    // and counting it would show numbers that change under the user.
    const subscriptions = hasHydrated ? stored : NO_SUBSCRIPTIONS;

    // Search narrows first so the filter chips' counts (below) reflect what's
    // actually reachable by the current search text, not the whole list.
    const searchMatches = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return normalizedQuery
            ? subscriptions.filter(({ name, category, plan }) =>
                  [name, category, plan].some((field) => field?.toLowerCase().includes(normalizedQuery))
              )
            : subscriptions;
    }, [query, subscriptions]);

    const statusCounts = useMemo(() => {
        const counts: Record<StatusFilter, number> = { all: searchMatches.length, active: 0, paused: 0, cancelled: 0 };
        for (const { status } of searchMatches) {
            const normalized = status?.toLowerCase();
            if (normalized === 'active' || normalized === 'paused' || normalized === 'cancelled') {
                counts[normalized] += 1;
            }
        }
        return counts;
    }, [searchMatches]);

    const visibleSubscriptions = useMemo(() => {
        const matches =
            statusFilter === 'all'
                ? searchMatches
                : searchMatches.filter(({ status }) => status?.toLowerCase() === statusFilter);

        if (sort !== 'renewal') return matches;

        return [...matches].sort((a, b) => {
            const aNext = nextRenewalDate(a.renewalDate, a.billing);
            const bNext = nextRenewalDate(b.renewalDate, b.billing);
            if (!aNext) return 1;
            if (!bNext) return -1;
            return aNext.valueOf() - bNext.valueOf();
        });
    }, [searchMatches, statusFilter, sort]);

    // An account with nothing in it needs a way forward; a search that matched
    // nothing needs to say so. Showing "add your first subscription" to someone
    // who has twelve and mistyped a filter would be nonsense.
    const renderEmpty = () => {
        if (!hasHydrated) return <HydrationGate />;
        if (subscriptions.length === 0) return <EmptySubscriptions onAddPress={openCreate} />;
        return <Text className="home-empty-state">No subscriptions match your search and filters.</Text>;
    };

    const openCreate = useCallback(() => {
        setEditing(null);
        setIsModalVisible(true);
    }, []);

    const openEdit = useCallback((subscription: Subscription) => {
        Keyboard.dismiss();
        setEditing(subscription);
        setIsModalVisible(true);
    }, []);

    const confirmCancel = useCallback((subscription: Subscription) => {
        Alert.alert(
            `Cancel ${subscription.name}?`,
            'It stays in your list marked as cancelled and stops counting toward your spend.',
            [
                { text: 'Keep it', style: 'cancel' },
                {
                    text: 'Cancel subscription',
                    style: 'destructive',
                    onPress: () => cancelSubscription(subscription.id),
                },
            ]
        );
    }, [cancelSubscription]);

    // Delete is unrecoverable - there's no undo - so the copy leans hard on
    // the distinction from Cancel, which merely marks status and keeps history.
    const confirmDelete = useCallback((subscription: Subscription) => {
        Alert.alert(
            `Delete ${subscription.name}?`,
            "This permanently removes it, including its history - there's no undo. To keep the record but stop billing, use Cancel instead.",
            [
                { text: 'Keep it', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteSubscription(subscription.id),
                },
            ]
        );
    }, [deleteSubscription]);

    // Not destructive and fully reversible, so no confirmation - unlike Cancel/Delete.
    const togglePauseResume = useCallback((subscription: Subscription) => {
        const next: SubscriptionStatus = subscription.status?.toLowerCase() === 'paused' ? 'active' : 'paused';
        setSubscriptionStatus(subscription.id, next);
    }, [setSubscriptionStatus]);

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <View className="search-bar">
                <Feather name="search" size={18} color={colors.mutedForeground} />
                <TextInput
                    className="search-input"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by name, category, or plan"
                    placeholderTextColor="rgba(0, 0, 0, 0.4)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')} accessibilityLabel="Clear search">
                        <Feather name="x" size={18} color={colors.mutedForeground} />
                    </Pressable>
                )}
            </View>

            {/* Composes with search rather than replacing it - counts are
                scoped to the current search matches, computed above. */}
            <View className="category-scroll mb-4">
                {STATUS_FILTERS.map(({ key, label }) => {
                    const active = statusFilter === key;
                    return (
                        <Pressable
                            key={key}
                            className={`category-chip${active ? ' category-chip-active' : ''}`}
                            onPress={() => setStatusFilter(key)}
                            accessibilityRole="button"
                            accessibilityLabel={`Show ${label.toLowerCase()} subscriptions`}
                            accessibilityState={{ selected: active }}
                        >
                            <Text className={`category-chip-text${active ? ' category-chip-text-active' : ''}`}>
                                {label} ({statusCounts[key]})
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            <FlatList
                className="flex-1"
                ListHeaderComponent={
                    <View className="list-head">
                        <Text className="list-title">
                            {sort === 'renewal' ? 'By next renewal' : 'Subscriptions'}
                        </Text>
                    </View>
                }
                data={visibleSubscriptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View>
                        <SubscriptionCard
                            {...item}
                            expanded={expandedId === item.id}
                            onPress={() => {
                                Keyboard.dismiss();
                                toggleExpanded(item.id);
                            }}
                            onEditPress={() => openEdit(item)}
                            onCancelPress={() => confirmCancel(item)}
                            onDeletePress={() => confirmDelete(item)}
                            onPauseResumePress={() => togglePauseResume(item)}
                        />
                        {/* SubscriptionCard's own Pressable already toggles expand on
                            tap - this sits outside it as a distinct affordance to the
                            full detail screen, so neither gesture steals the other. */}
                        <Pressable
                            className="detail-link-row"
                            onPress={() => router.push({ pathname: '/subscriptions/[id]', params: { id: item.id } })}
                            accessibilityRole="button"
                            accessibilityLabel={`View details for ${item.name}`}
                        >
                            <Text className="detail-link-text">Details</Text>
                            <Feather name="chevron-right" size={16} color={colors.accent} />
                        </Pressable>
                    </View>
                )}
                extraData={expandedId}
                ItemSeparatorComponent={() => <View className="h-4" />}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                // iOS-only: insets the list so the keyboard can't cover the last
                // card. Android needs nothing here - Expo defaults
                // softwareKeyboardLayoutMode to "resize", which already shrinks
                // the window, so adding our own spacer would double-count it.
                automaticallyAdjustKeyboardInsets
                ListEmptyComponent={renderEmpty()}
                contentContainerClassName="pb-30"
            />

            <AddSubscriptionButton onPress={openCreate} />

            <CreateSubscriptionModal
                visible={isModalVisible}
                subscription={editing}
                existingSubscriptions={subscriptions}
                onClose={() => setIsModalVisible(false)}
                onSubmit={editing ? updateSubscription : addSubscription}
            />
        </SafeAreaView>
    )
}
export default Subscriptions
