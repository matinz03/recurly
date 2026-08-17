import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useMemo } from 'react';
import ListHeading from '@/components/ListHeading';
import HydrationGate from '@/components/HydrationGate';
import { formatCurrency, monthlyPrice, totalsByCurrency } from '@/lib/utils';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

const SafeAreaView = styled(RNSafeAreaView);

const TOP_LIMIT = 5;
const STATUSES = ['active', 'paused', 'cancelled'] as const;

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

    const insights = useMemo(() => {
        // Only active plans are money you're actually committed to; paused and
        // cancelled ones would inflate every total.
        const active = subscriptions.filter((s) => s.status?.toLowerCase() === 'active');

        // Never sum across currencies (see docs/DECISIONS.md). The stat tiles
        // and breakdowns below are scoped to the single largest currency;
        // anything else active is called out in otherTotals rather than
        // silently blended into the totals.
        const totals = totalsByCurrency(subscriptions);
        const dominant = totals[0];
        const currency = dominant?.currency ?? 'USD';
        const otherTotals = totals.slice(1);
        const dominantActive = active.filter((s) => (s.currency ?? 'USD') === currency);

        const monthlyTotal = dominant?.monthly ?? 0;

        const byCategory = new Map<string, number>();
        for (const subscription of dominantActive) {
            const key = subscription.category?.trim() || subscription.plan?.trim() || 'Uncategorised';
            byCategory.set(key, (byCategory.get(key) ?? 0) + monthlyPrice(subscription));
        }

        const categories = [...byCategory.entries()]
            .map(([label, amount]) => ({ label, amount }))
            .sort((a, b) => b.amount - a.amount);

        const top = [...dominantActive]
            .map((s) => ({ id: s.id, name: s.name, amount: monthlyPrice(s), billing: s.billing }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, TOP_LIMIT);

        const counts = STATUSES.map((status) => ({
            status,
            count: subscriptions.filter((s) => s.status?.toLowerCase() === status).length,
        }));

        return {
            currency,
            monthlyTotal,
            yearlyTotal: monthlyTotal * 12,
            activeCount: dominantActive.length,
            averageCost: dominantActive.length ? monthlyTotal / dominantActive.length : 0,
            categories,
            top,
            counts,
            otherTotals,
        };
    }, [subscriptions]);

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
                        <Text className="insights-stat-value">{formatCurrency(insights.monthlyTotal, insights.currency)}</Text>
                        <Text className="insights-stat-meta">
                            {insights.activeCount} active {insights.activeCount === 1 ? 'plan' : 'plans'}
                        </Text>
                    </View>
                    <View className="insights-stat">
                        <Text className="insights-stat-label">Per year</Text>
                        <Text className="insights-stat-value">{formatCurrency(insights.yearlyTotal, insights.currency)}</Text>
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
                                    <Text className="insights-row-value">{formatCurrency(amount, insights.currency)}</Text>
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
