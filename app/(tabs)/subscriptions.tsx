import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from 'expo-router';
import { styled } from "nativewind";
import { Feather } from '@expo/vector-icons';
import { spacing, useThemeColors } from "@/constants/theme";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import AddSubscriptionButton from "@/components/AddSubscriptionButton";
import HydrationGate from "@/components/HydrationGate";
import EmptySubscriptions from "@/components/EmptySubscriptions";
import { nextRenewalDate } from "@/lib/utils";
import { notifyDestructive, notifySuccess } from "@/lib/haptics";
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { useExpandedSubscription } from "@/lib/useExpandedSubscription";

const SafeAreaView = styled(RNSafeAreaView);

type StatusFilter = 'all' | SubscriptionStatus;

/** Stable reference so the hydration fallback can't bust useMemo deps. */
const NO_SUBSCRIPTIONS: Subscription[] = [];

/** Off-screen, not display:none - display:none would drop it from the
    accessibility tree entirely, defeating the live region below. */
const SR_ONLY = { position: 'absolute' as const, top: -9999, left: -9999, width: 1, height: 1, opacity: 0 };

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'paused', label: 'Paused' },
    { key: 'cancelled', label: 'Cancelled' },
];

const Subscriptions = () => {
    const colors = useThemeColors();
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

    // `edgeToEdgeEnabled` is on, so on Android the window does NOT shrink when
    // the keyboard opens - it becomes an inset the app has to handle, and
    // softwareKeyboardLayoutMode: "resize" no longer applies. Without this the
    // last cards sit behind the keyboard with no scroll range to reach them.
    // iOS is handled by automaticallyAdjustKeyboardInsets on the list instead.
    const [keyboardInset, setKeyboardInset] = useState(0);

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const show = Keyboard.addListener('keyboardDidShow', (event) =>
            setKeyboardInset(event.endCoordinates.height)
        );
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardInset(0));

        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

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
    const handleSubmitSubscription = useCallback((subscription: Subscription) => {
        if (editing) updateSubscription(subscription);
        else addSubscription(subscription);
        notifySuccess();
    }, [editing, updateSubscription, addSubscription]);

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
                    onPress: () => {
                        notifyDestructive();
                        cancelSubscription(subscription.id);
                    },
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
                    onPress: () => {
                        notifyDestructive();
                        deleteSubscription(subscription.id);
                    },
                },
            ]
        );
    }, [deleteSubscription]);

    // Not destructive and fully reversible, so no confirmation - unlike Cancel/Delete.
    const togglePauseResume = useCallback((subscription: Subscription) => {
        const next: SubscriptionStatus = subscription.status?.toLowerCase() === 'paused' ? 'active' : 'paused';
        setSubscriptionStatus(subscription.id, next);
    }, [setSubscriptionStatus]);

    // Visually hidden - narrating the list changing under the search box and
    // the hydration spinner resolving into real content, neither of which is
    // a navigation event a screen reader would otherwise notice. Android's
    // TalkBack announces the new text whenever it changes; iOS VoiceOver
    // largely ignores accessibilityLiveRegion, so this is a partial fix - see
    // the accessibility-pass report.
    const liveStatus = !hasHydrated
        ? 'Loading your subscriptions'
        : `${visibleSubscriptions.length} ${visibleSubscriptions.length === 1 ? 'subscription' : 'subscriptions'} shown`;

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <Text accessibilityLiveRegion="polite" style={SR_ONLY}>{liveStatus}</Text>

            {/* Outside the FlatList so it stays put, and so the pinned add
                button has a row to sit on rather than overlapping the search
                field. */}
            <View className="list-head">
                <Text className="list-title">
                    {sort === 'renewal' ? 'By next renewal' : 'Subscriptions'}
                </Text>
            </View>

            <View className="search-bar">
                {/* Decorative - the TextInput's own placeholder already says
                    what the field is for. */}
                <Feather
                    name="search"
                    size={18}
                    color={colors.mutedForeground}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                />
                <TextInput
                    className="search-input"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search by name, category, or plan"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {query.length > 0 && (
                    <Pressable
                        onPress={() => setQuery('')}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        // The icon alone renders at ~18x18 - well under the 44pt
                        // minimum. Growing it visually would look oversized next to
                        // the input, so extend the tap target with hitSlop instead.
                        hitSlop={13}
                    >
                        <Feather name="x" size={18} color={colors.mutedForeground} />
                    </Pressable>
                )}
            </View>

            {/* Composes with search rather than replacing it - counts are
                scoped to the current search matches, computed above. */}
            <View className="category-scroll mb-4" accessibilityRole="radiogroup">
                {STATUS_FILTERS.map(({ key, label }) => {
                    const active = statusFilter === key;
                    return (
                        <Pressable
                            key={key}
                            className={`category-chip${active ? ' category-chip-active' : ''}`}
                            onPress={() => setStatusFilter(key)}
                            accessibilityRole="radio"
                            accessibilityLabel={`Show ${label.toLowerCase()} subscriptions`}
                            accessibilityState={{ selected: active }}
                            // `.category-chip` is ~36pt tall - under the 44pt minimum.
                            // Chips sit in a flex-wrap row with an 8px gap, so 4pt of
                            // hitSlop per side reaches 44pt without overlapping the
                            // neighbouring chip's own hitSlop.
                            hitSlop={{ top: 4, bottom: 4 }}
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
                            // No vertical padding on `.detail-link-row` - content is
                            // only ~20pt tall, under the 44pt minimum. hitSlop instead
                            // of adding padding, which would push the row away from
                            // the card it's paired with.
                            hitSlop={{ top: 12, bottom: 12 }}
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
                // One source of truth: clearance for the floating tab bar,
                // plus the keyboard on Android where the window doesn't shrink.
                // A contentContainerStyle paddingBottom would otherwise just
                // override the class's, dropping the tab-bar clearance.
                contentContainerStyle={{ paddingBottom: spacing[30] + keyboardInset }}
            />

            <AddSubscriptionButton onPress={openCreate} />

            <CreateSubscriptionModal
                visible={isModalVisible}
                subscription={editing}
                existingSubscriptions={subscriptions}
                onClose={() => setIsModalVisible(false)}
                onSubmit={handleSubmitSubscription}
            />
        </SafeAreaView>
    )
}
export default Subscriptions
