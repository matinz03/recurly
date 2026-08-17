import { useMemo, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Feather } from '@expo/vector-icons';
import { HOME_SUBSCRIPTIONS } from "@/constants/data";
import { colors } from "@/constants/theme";
import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import { posthog } from "@/lib/posthog";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
    const [query, setQuery] = useState('');
    const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);

    const filteredSubscriptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        if (!normalizedQuery) return HOME_SUBSCRIPTIONS;

        return HOME_SUBSCRIPTIONS.filter(({ name, category, plan }) =>
            [name, category, plan].some((field) => field?.toLowerCase().includes(normalizedQuery))
        );
    }, [query]);

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
                <ListHeading title="Subscriptions" />

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
                    contentContainerClassName="pb-18"
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
export default Subscriptions
