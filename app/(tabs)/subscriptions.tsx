import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from 'expo-router';
import { styled } from "nativewind";
import { Feather } from '@expo/vector-icons';
import { colors } from "@/constants/theme";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import AddSubscriptionButton from "@/components/AddSubscriptionButton";
import { nextRenewalDate } from "@/lib/utils";
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { useExpandedSubscription } from "@/lib/useExpandedSubscription";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
    // Set by Home's "View all" on the Upcoming heading.
    const { sort } = useLocalSearchParams<{ sort?: string }>();

    const [query, setQuery] = useState('');
    const [editing, setEditing] = useState<Subscription | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { subscriptions, addSubscription, updateSubscription, cancelSubscription } = useSubscriptionStore();
    const { expandedId, toggleExpanded } = useExpandedSubscription();

    const visibleSubscriptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        const matches = normalizedQuery
            ? subscriptions.filter(({ name, category, plan }) =>
                  [name, category, plan].some((field) => field?.toLowerCase().includes(normalizedQuery))
              )
            : subscriptions;

        if (sort !== 'renewal') return matches;

        return [...matches].sort((a, b) => {
            const aNext = nextRenewalDate(a.renewalDate, a.billing);
            const bNext = nextRenewalDate(b.renewalDate, b.billing);
            if (!aNext) return 1;
            if (!bNext) return -1;
            return aNext.valueOf() - bNext.valueOf();
        });
    }, [query, subscriptions, sort]);

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
                    <SubscriptionCard
                        {...item}
                        expanded={expandedId === item.id}
                        onPress={() => {
                            Keyboard.dismiss();
                            toggleExpanded(item.id);
                        }}
                        onEditPress={() => openEdit(item)}
                        onCancelPress={() => confirmCancel(item)}
                    />
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
                ListEmptyComponent={<Text className="home-empty-state">No subscriptions match your search.</Text>}
                contentContainerClassName="pb-30"
            />

            <AddSubscriptionButton onPress={openCreate} />

            <CreateSubscriptionModal
                visible={isModalVisible}
                subscription={editing}
                onClose={() => setIsModalVisible(false)}
                onSubmit={editing ? updateSubscription : addSubscription}
            />
        </SafeAreaView>
    )
}
export default Subscriptions
