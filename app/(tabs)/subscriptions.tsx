import { useMemo, useState } from 'react';
import { FlatList, Image, Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Feather } from '@expo/vector-icons';
import { colors } from "@/constants/theme";
import { icons } from "@/constants/icons";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { useExpandedSubscription } from "@/lib/useExpandedSubscription";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
    const [query, setQuery] = useState('');
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const { subscriptions, addSubscription } = useSubscriptionStore();
    const { expandedId, toggleExpanded } = useExpandedSubscription();

    const filteredSubscriptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return subscriptions;

        return subscriptions.filter(({ name, category, plan }) =>
            [name, category, plan].some((field) => field?.toLowerCase().includes(normalizedQuery))
        );
    }, [query, subscriptions]);

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
                        <Text className="list-title">Subscriptions</Text>
                        <Pressable className="home-add-icon" onPress={() => setIsCreateModalVisible(true)} accessibilityLabel="Add subscription">
                            <Image source={icons.add} className="home-add-icon-glyph" />
                        </Pressable>
                    </View>
                }
                data={filteredSubscriptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <SubscriptionCard
                        {...item}
                        expanded={expandedId === item.id}
                        onPress={() => {
                            Keyboard.dismiss();
                            toggleExpanded(item.id);
                        }}
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
                contentContainerClassName="pb-18"
            />

            <CreateSubscriptionModal
                visible={isCreateModalVisible}
                onClose={() => setIsCreateModalVisible(false)}
                onSubmit={addSubscription}
            />
        </SafeAreaView>
    )
}
export default Subscriptions
