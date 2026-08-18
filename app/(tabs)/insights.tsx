import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useMemo } from 'react';
import ListHeading from '@/components/ListHeading';
import Money from '@/components/Money';
import HydrationGate from '@/components/HydrationGate';
import { formatCurrency } from '@/lib/utils';
import { computeInsights } from '@/lib/insights';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

const SafeAreaView = styled(RNSafeAreaView);


/** Stable reference so the hydration fallback can't bust useMemo deps. */
const NO_SUBSCRIPTIONS: Subscription[] = [];

/** Off-screen, not display:none - display:none would drop it from the
    accessibility tree entirely, defeating the live region below. */
const SR_ONLY = { position: 'absolute' as const, top: -9999, left: -9999, width: 1, height: 1, opacity: 0 };

const Insights = () => {
    const { subscriptions: stored, hasHydrated } = useSubscriptionStore();

    // Spend totals for subscriptions the user may not own are worse than no
    // totals - don't compute anything until AsyncStorage has resolved.
    const subscriptions = hasHydrated ? stored : NO_SUBSCRIPTIONS;

    const insights = useMemo(() => computeInsights(subscriptions), [subscriptions]);

    // Bars are drawn relative to the largest row so the smallest is still visible.
    const largestCategory = insights.categories[0]?.amount ?? 0;
    const largestTop = insights.top[0]?.amount ?? 0;

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            {/* Visually hidden - the hydration spinner resolving into real
                content isn't a navigation event, so nothing would otherwise
                tell a screen reader the wait is over. Android's TalkBack
                announces the new text; iOS VoiceOver largely ignores
                accessibilityLiveRegion, so this is a partial fix. */}
            <Text accessibilityLiveRegion="polite" style={SR_ONLY}>
                {hasHydrated ? 'Insights loaded' : 'Loading insights'}
            </Text>

            <ListHeading title="Insights" />

            {!hasHydrated ? (
                <HydrationGate />
            ) : (
            <ScrollView
                className="insights-scroll"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="insights-content"
            >
                <View className="insights-summary-row">
                    <View className="insights-stat">
                        <Text className="insights-stat-label">Per month</Text>
                        <Money value={insights.monthlyTotal} currency={insights.currency} className="insights-stat-value" />
                        <Text className="insights-stat-meta">
                            {insights.activeCount} active {insights.activeCount === 1 ? 'plan' : 'plans'}
                        </Text>
                    </View>
                    <View className="insights-stat">
                        <Text className="insights-stat-label">Per year</Text>
                        <Money value={insights.yearlyTotal} currency={insights.currency} className="insights-stat-value" />
                        <Text className="insights-stat-meta">
                            {formatCurrency(insights.averageCost, insights.currency)} avg / plan
                        </Text>
                    </View>
                </View>

                {/* Only present with more than one active currency, so the totals
                    above are never a silent blend - the rest is called out here. */}
                {insights.otherTotals.length > 0 && (
                    <Text className="insights-note">
                        Also active, not included below: {insights.otherTotals
                            .map((total) => `${formatCurrency(total.monthly, total.currency)}/mo across ${total.count} ${total.count === 1 ? 'plan' : 'plans'}`)
                            .join(' · ')}
                    </Text>
                )}

                <View className="insights-card">
                    <Text className="insights-card-title">Where it goes</Text>
                    {insights.categories.length === 0 ? (
                        <Text className="home-empty-state">Nothing active to break down yet.</Text>
                    ) : (
                        insights.categories.map(({ label, amount }) => (
                            <View key={label} className="insights-row">
                                <View className="insights-row-head">
                                    <Text className="insights-row-label" numberOfLines={1}>{label}</Text>
                                    <Text className="insights-row-value">
                                        {insights.monthlyTotal > 0
                                            ? `${Math.round((amount / insights.monthlyTotal) * 100)}%`
                                            : '0%'}
                                    </Text>
                                </View>
                                <View className="insights-track">
                                    <View
                                        className="insights-fill"
                                        style={{ width: `${largestCategory > 0 ? (amount / largestCategory) * 100 : 0}%` }}
                                    />
                                </View>
                                <Text className="insights-stat-meta">{formatCurrency(amount, insights.currency)} / month</Text>
                            </View>
                        ))
                    )}
                </View>

                <View className="insights-card">
                    <Text className="insights-card-title">Biggest costs</Text>
                    {insights.top.length === 0 ? (
                        <Text className="home-empty-state">Nothing active to rank yet.</Text>
                    ) : (
                        insights.top.map(({ id, name, amount, billing }) => (
                            <View key={id} className="insights-row">
                                <View className="insights-row-head">
                                    <Text className="insights-row-label" numberOfLines={1}>{name}</Text>
                                    <Money value={amount} currency={insights.currency} className="insights-row-value" />
                                </View>
                                <View className="insights-track">
                                    <View
                                        className="insights-fill"
                                        style={{ width: `${largestTop > 0 ? (amount / largestTop) * 100 : 0}%` }}
                                    />
                                </View>
                                {billing?.toLowerCase() === 'yearly' && (
                                    <Text className="insights-stat-meta">Billed yearly, shown per month</Text>
                                )}
                            </View>
                        ))
                    )}
                </View>

                <View className="insights-card">
                    <Text className="insights-card-title">Status</Text>
                    <Text className="insights-stat-meta">Across all currencies</Text>
                    <View className="insights-status-row">
                        {insights.counts.map(({ status, count }) => (
                            <View key={status} className="insights-status">
                                <Text className="insights-status-value">{count}</Text>
                                <Text className="insights-status-label">{status}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
            )}
        </SafeAreaView>
    )
}
export default Insights
