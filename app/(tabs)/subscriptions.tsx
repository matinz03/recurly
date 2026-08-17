import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from 'expo-router';
import { styled } from "nativewind";
import { Feather } from '@expo/vector-icons';
import { colors } from "@/constants/theme";
import { icons } from "@/constants/icons";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import { posthog } from "@/lib/posthog";
import { useSubscriptionStore } from "@/lib/subscriptionStore";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
    const [query, setQuery] = useState('');
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const { subscriptions, addSubscription } = useSubscriptionStore();

    // Don't leave a card expanded from a previous visit to this tab.
    useFocusEffect(
        useCallback(() => {
            return () => setExpandedSubscriptionId(null);
        }, [])
    );

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showListener = Keyboard.addListener(showEvent, (event) => {
            setKeyboardHeight(event.endCoordinates.height);
        });
        const hideListener = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

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
                        expanded={expandedSubscriptionId === item.id}
                        onPress={() => {
                            Keyboard.dismiss();
                            const expanded = expandedSubscriptionId !== item.id;
                            setExpandedSubscriptionId(expanded ? item.id : null);
                            posthog?.capture('subscription_details_toggled', {
                                subscription_id: item.id,
                                expanded,
                            });
                        }}
                    />
                )}
                extraData={expandedSubscriptionId}
                ItemSeparatorComponent={() => <View className="h-4" />}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={<Text className="home-empty-state">No subscriptions match your search.</Text>}
                ListFooterComponent={keyboardHeight > 0 ? <View style={{ height: keyboardHeight }} /> : null}
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
