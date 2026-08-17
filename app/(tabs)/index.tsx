import "@/global.css"
import {FlatList, Image, Pressable, Text, View} from "react-native";
import {SafeAreaView as RNSafeAreaView} from "react-native-safe-area-context";
import { styled } from "nativewind";
import images from "@/constants/images";
import {HOME_BALANCE, UPCOMING_SUBSCRIPTIONS} from "@/constants/data";
import {icons} from "@/constants/icons";
import {formatCurrency} from "@/lib/utils";
import dayjs from "dayjs";
import ListHeading from "@/components/ListHeading";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import SubscriptionCard from "@/components/SubscriptionCard";
import CreateSubscriptionModal from "@/components/CreateSubscriptionModal";
import {useState} from "react";
import { useUser } from '@clerk/expo';
import { useSubscriptionStore } from "@/lib/subscriptionStore";
import { useExpandedSubscription } from "@/lib/useExpandedSubscription";
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
    const { user } = useUser();
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const { subscriptions, addSubscription } = useSubscriptionStore();
    const { expandedId, toggleExpanded } = useExpandedSubscription();

    // Get user display name: firstName, fullName, or email
    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
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

                                <Pressable className="home-add-icon" onPress={() => setIsCreateModalVisible(true)} accessibilityLabel="Add subscription">
                                    <Image source={icons.add} className="home-add-icon-glyph" />
                                </Pressable>
                            </View>

                            <View className="home-balance-card">
                                <Text className="home-balance-label">Balance</Text>

                                <View className="home-balance-row">
                                    <Text className="home-balance-amount">
                                        {formatCurrency(HOME_BALANCE.amount)}
                                    </Text>
                                    <Text className="home-balance-date">
                                        {dayjs(HOME_BALANCE.nextRenewalDate).format('MM/DD')}
                                    </Text>
                                </View>
                            </View>

                            <View className="mb-5">
                                <ListHeading title="Upcoming" />

                                <FlatList
                                    data={UPCOMING_SUBSCRIPTIONS}
                                    renderItem={({ item }) => (<UpcomingSubscriptionCard {...item} />)}
                                    keyExtractor={(item) => item.id}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    ListEmptyComponent={<Text className="home-empty-state">No upcoming renewals yet.</Text>}
                                />
                            </View>

                            <ListHeading title="All Subscriptions" />
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
                    ListEmptyComponent={<Text className="home-empty-state">No subscriptions yet.</Text>}
                    contentContainerClassName="pb-18"
                />

                <CreateSubscriptionModal
                    visible={isCreateModalVisible}
                    onClose={() => setIsCreateModalVisible(false)}
                    onSubmit={addSubscription}
                />
        </SafeAreaView>
    );
}
