import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { styled } from 'nativewind';
import { useMemo } from 'react';
import { icons } from '@/constants/icons';
import { colors } from '@/constants/theme';
import SubscriptionIcon from '@/components/SubscriptionIcon';
import HydrationGate from '@/components/HydrationGate';
import { useSubscriptionStore } from '@/lib/subscriptionStore';
import { daysUntil, formatCurrency, formatStatusLabel, formatSubscriptionDateTime, nextRenewalDate } from '@/lib/utils';

const SafeAreaView = styled(RNSafeAreaView);

/** Off-screen, not display:none - display:none would drop it from the
    accessibility tree entirely, defeating the live region below. */
const SR_ONLY = { position: 'absolute' as const, top: -9999, left: -9999, width: 1, height: 1, opacity: 0 };

const SubscriptionDetails = () => {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { subscriptions, hasHydrated } = useSubscriptionStore();

    const subscription = useMemo(
        () => subscriptions.find((item) => item.id === id),
        [subscriptions, id]
    );

    // Cancelled subscriptions never renew again, so no computed date should be
    // shown for them - unlike a plain missing renewalDate, this is a known,
    // intentional state.
    const renewal = useMemo(() => {
        if (!subscription) return null;
        if (subscription.status?.toLowerCase() === 'cancelled') {
            return { next: null, daysLeft: null, cancelled: true };
        }
        const next = nextRenewalDate(subscription.renewalDate, subscription.billing);
        return { next, daysLeft: next ? daysUntil(next) : null, cancelled: false };
    }, [subscription]);

    return (
        <SafeAreaView className="flex-1 bg-background">
            {/* Visually hidden - the hydration spinner resolving (or the record
                turning out to be missing) isn't a navigation event, so nothing
                would otherwise tell a screen reader the wait is over. Android's
                TalkBack announces the new text; iOS VoiceOver largely ignores
                accessibilityLiveRegion, so this is a partial fix. */}
            <Text accessibilityLiveRegion="polite" style={SR_ONLY}>
                {!hasHydrated
                    ? 'Loading subscription details'
                    : subscription
                      ? 'Subscription details loaded'
                      : 'Subscription not found'}
            </Text>

            <View className="detail-header">
                <Pressable
                    className="detail-back"
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    // `.detail-back` is a fixed 40pt circle - just under the 44pt
                    // minimum. hitSlop closes the gap without changing the header's
                    // visual sizing.
                    hitSlop={2}
                >
                    <Image source={icons.back} className="detail-back-icon" resizeMode="contain" />
                </Pressable>
                <Text className="detail-header-title">Details</Text>
                <View className="detail-header-spacer" />
            </View>

            {/* Before hydration the store still holds the seed list, so a
                real id can look missing. Claiming "not found" and then
                rendering it a moment later is worse than a brief spinner. */}
            {!hasHydrated ? (
                <HydrationGate />
            ) : !subscription ? (
                <View className="detail-missing">
                    <Text className="detail-missing-text">
                        This subscription couldn&apos;t be found. It may have been removed, or the link is out of date.
                    </Text>
                    <Pressable className="detail-missing-button" onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
                        <Text className="detail-missing-button-text">Go back</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="detail-content">
                    {/* subscription.color is the fixed category pastel (data, not
                        theme - see docs/DECISIONS.md), so the ink on top of it uses
                        the static light-theme colors, never the app's dark-mode ink,
                        or it would vanish against a light pastel in dark mode. */}
                    <View className="detail-hero" style={subscription.color ? { backgroundColor: subscription.color } : undefined}>
                        <SubscriptionIcon icon={subscription.icon} className="detail-hero-icon" svgSize={48} />
                        <Text numberOfLines={2} className="detail-name" style={subscription.color ? { color: colors.primary } : undefined}>{subscription.name}</Text>
                        <View className="detail-price-row">
                            <Text className="detail-price" style={subscription.color ? { color: colors.primary } : undefined}>{formatCurrency(subscription.price, subscription.currency)}</Text>
                            <Text className="detail-billing" style={subscription.color ? { color: colors.mutedForeground } : undefined}>/ {subscription.billing}</Text>
                        </View>
                        <View className="detail-status-badge">
                            <Text className="detail-status-text">{formatStatusLabel(subscription.status)}</Text>
                        </View>
                    </View>

                    <View className="detail-renewal-card">
                        <Text className="detail-renewal-label">Next renewal</Text>
                        <Text className="detail-renewal-date">
                            {renewal?.cancelled
                                ? 'Not renewing'
                                : renewal?.next
                                  ? formatSubscriptionDateTime(renewal.next.toISOString())
                                  : 'Not provided'}
                        </Text>
                        {renewal?.next && renewal.daysLeft !== null && (
                            <Text className="detail-renewal-days">
                                {renewal.daysLeft === 0
                                    ? 'Renews today'
                                    : renewal.daysLeft === 1
                                      ? 'Renews in 1 day'
                                      : `Renews in ${renewal.daysLeft} days`}
                            </Text>
                        )}
                    </View>

                    <View className="insights-card">
                        <View className="sub-details">
                            <View className="sub-row">
                                <View className="sub-row-copy">
                                    <Text className="sub-label">Category:</Text>
                                    <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">
                                        {subscription.category?.trim() || subscription.plan?.trim() || 'Not provided'}
                                    </Text>
                                </View>
                            </View>
                            <View className="sub-row">
                                <View className="sub-row-copy">
                                    <Text className="sub-label">Payment:</Text>
                                    <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">
                                        {subscription.paymentMethod?.trim() || 'Not provided'}
                                    </Text>
                                </View>
                            </View>
                            <View className="sub-row">
                                <View className="sub-row-copy">
                                    <Text className="sub-label">Started:</Text>
                                    <Text className="sub-value" numberOfLines={1} ellipsizeMode="tail">
                                        {subscription.startDate ? formatSubscriptionDateTime(subscription.startDate) : 'Not provided'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    )
}

export default SubscriptionDetails
