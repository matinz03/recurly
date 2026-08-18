import { monthlyPrice, totalsByCurrency } from '@/lib/utils';

const TOP_LIMIT = 5;

export const INSIGHT_STATUSES = ['active', 'paused', 'cancelled'] as const;

export type InsightStatus = (typeof INSIGHT_STATUSES)[number];

export interface Insights {
    /** The single currency every money figure below is expressed in. */
    currency: string;
    monthlyTotal: number;
    yearlyTotal: number;
    activeCount: number;
    averageCost: number;
    categories: { label: string; amount: number }[];
    top: { id: string; name: string; amount: number; billing?: string }[];
    /** Covers every currency, not just the dominant one. */
    counts: { status: InsightStatus; count: number }[];
    /** Active totals in every other currency, reported rather than blended. */
    otherTotals: ReturnType<typeof totalsByCurrency>;
}

const isActive = (subscription: Subscription) => subscription.status?.toLowerCase() === 'active';

/**
 * Every figure on the Insights screen, derived from the stored subscriptions.
 *
 * Pure and extracted from the screen so the multi-currency rules below are
 * testable - they're the most bug-prone logic in the app, and two regressions
 * have already shipped in them.
 *
 * Never sums across currencies (see docs/DECISIONS.md). Money figures are
 * scoped to the single largest currency; anything else active is reported in
 * `otherTotals` instead of being silently blended in.
 */
export const computeInsights = (subscriptions: Subscription[]): Insights => {
    // Only active plans are money you're actually committed to; paused and
    // cancelled ones would inflate every total.
    const active = subscriptions.filter(isActive);

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

    // Deliberately counts every subscription, not just the dominant currency's.
    // Counts aren't money, so there's nothing to mix - and scoping them hid
    // records entirely: `currency` is derived from active subscriptions only, so
    // an account whose plans are all cancelled in EUR fell back to USD and
    // reported zero of everything. The card is labelled as covering all
    // currencies so it can't be read as contradicting the scoped totals.
    const counts = INSIGHT_STATUSES.map((status) => ({
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
};
