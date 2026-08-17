import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useMemo } from 'react';
import ListHeading from '@/components/ListHeading';
import { formatCurrency, monthlyPrice } from '@/lib/utils';
import { useSubscriptionStore } from '@/lib/subscriptionStore';

const SafeAreaView = styled(RNSafeAreaView);

const TOP_LIMIT = 5;
const STATUSES = ['active', 'paused', 'cancelled'] as const;

const Insights = () => {
    const { subscriptions } = useSubscriptionStore();

    const insights = useMemo(() => {
        // Only active plans are money you're actually committed to; paused and
        // cancelled ones would inflate every total.
        const active = subscriptions.filter((s) => s.status?.toLowerCase() === 'active');
        const monthlyTotal = active.reduce((total, s) => total + monthlyPrice(s), 0);

        const byCategory = new Map<string, number>();
        for (const subscription of active) {
            const key = subscription.category?.trim() || subscription.plan?.trim() || 'Uncategorised';
            byCategory.set(key, (byCategory.get(key) ?? 0) + monthlyPrice(subscription));
        }

        const categories = [...byCategory.entries()]
            .map(([label, amount]) => ({ label, amount }))
            .sort((a, b) => b.amount - a.amount);

        const top = [...active]
            .map((s) => ({ id: s.id, name: s.name, amount: monthlyPrice(s), billing: s.billing }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, TOP_LIMIT);

        const counts = STATUSES.map((status) => ({
            status,
            count: subscriptions.filter((s) => s.status?.toLowerCase() === status).length,
        }));

        return {
            monthlyTotal,
            yearlyTotal: monthlyTotal * 12,
            activeCount: active.length,
            averageCost: active.length ? monthlyTotal / active.length : 0,
            categories,
            top,
            counts,
        };
    }, [subscriptions]);

    // Bars are drawn relative to the largest row so the smallest is still visible.
    const largestCategory = insights.categories[0]?.amount ?? 0;
    const largestTop = insights.top[0]?.amount ?? 0;

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <ListHeading title="Insights" />

            <ScrollView
                className="insights-scroll"
                showsVerticalScrollIndicator={false}
                contentContainerClassName="insights-content"
            >
                <View className="insights-summary-row">
                    <View className="insights-stat">
                        <Text className="insights-stat-label">Per month</Text>
                        <Text className="insights-stat-value">{formatCurrency(insights.monthlyTotal)}</Text>
                        <Text className="insights-stat-meta">
                            {insights.activeCount} active {insights.activeCount === 1 ? 'plan' : 'plans'}
                        </Text>
                    </View>
                    <View className="insights-stat">
                        <Text className="insights-stat-label">Per year</Text>
                        <Text className="insights-stat-value">{formatCurrency(insights.yearlyTotal)}</Text>
                        <Text className="insights-stat-meta">
                            {formatCurrency(insights.averageCost)} avg / plan
                        </Text>
                    </View>
                </View>

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
                                <Text className="insights-stat-meta">{formatCurrency(amount)} / month</Text>
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
                                    <Text className="insights-row-value">{formatCurrency(amount)}</Text>
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
        </SafeAreaView>
    )
}
export default Insights
