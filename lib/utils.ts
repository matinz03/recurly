import dayjs from "dayjs";

export const formatCurrency = (value: number, currency = "USD"): string => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
};

export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const parsedDate = dayjs(value);
  return parsedDate.isValid() ? parsedDate.format("MM/DD/YYYY") : "Not provided";
};

export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const billingUnit = (billing?: string): "month" | "year" =>
  billing?.toLowerCase() === "yearly" ? "year" : "month";

/**
 * The next renewal that hasn't happened yet.
 *
 * A stored renewalDate goes stale as soon as it passes - a monthly plan that
 * renewed in March has renewed several times since - so roll it forward by the
 * billing period until it lands in the future. Returns null for a missing or
 * unparseable date.
 */
export const nextRenewalDate = (
  renewalDate?: string,
  billing?: string,
): dayjs.Dayjs | null => {
  if (!renewalDate) return null;
  const parsed = dayjs(renewalDate);
  if (!parsed.isValid()) return null;

  const unit = billingUnit(billing);
  const now = dayjs();
  let next = parsed;
  // Bounded so a far-past date (or a clock skew) can't spin forever.
  for (let i = 0; i < 600 && next.isBefore(now); i += 1) {
    next = next.add(1, unit);
  }
  return next;
};

/** Whole days from now until `date`, floored at 0. */
export const daysUntil = (date: dayjs.Dayjs): number =>
  Math.max(0, date.startOf("day").diff(dayjs().startOf("day"), "day"));

/** Price normalised to a monthly figure, so yearly plans stay comparable. */
export const monthlyPrice = ({ price, billing }: Subscription): number =>
  billingUnit(billing) === "year" ? price / 12 : price;

export interface CurrencyTotal {
  currency: string;
  monthly: number;
  yearly: number;
  count: number;
}

/**
 * One entry per distinct currency present among active subscriptions, sorted
 * by monthly spend descending.
 *
 * Deliberately never sums across currencies - $10 + €10 is not $20 - so every
 * screen that shows a total must pick from this list (dominant entry, plus
 * the rest called out separately) rather than reducing straight to a number.
 * A missing `currency` is treated as 'USD', matching the seed data's implicit
 * default. Cancelled/paused subscriptions are excluded, same rule as every
 * other spend total in the app.
 */
export const totalsByCurrency = (subscriptions: Subscription[]): CurrencyTotal[] => {
  const byCurrency = new Map<string, { monthly: number; count: number }>();

  for (const subscription of subscriptions) {
    if (subscription.status?.toLowerCase() !== "active") continue;
    const currency = subscription.currency ?? "USD";
    const existing = byCurrency.get(currency) ?? { monthly: 0, count: 0 };
    existing.monthly += monthlyPrice(subscription);
    existing.count += 1;
    byCurrency.set(currency, existing);
  }

  return [...byCurrency.entries()]
    .map(([currency, { monthly, count }]) => ({
      currency,
      monthly,
      yearly: monthly * 12,
      count,
    }))
    .sort((a, b) => b.monthly - a.monthly);
};

// Same normalize-then-compare shape as matchSubscriptionIcon's brand lookup:
// lowercase and strip everything but letters/digits, so "Netflix", "netflix!"
// and "NET FLIX" all collapse to the same key.
const normalizeSubscriptionName = (name: string): string =>
    name.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Finds an existing subscription whose name normalizes to the same value as
 * `name` - a possible accidental duplicate, not a hard rule. Pass `excludeId`
 * (the record being edited) so a subscription never matches itself when its
 * name is unchanged; without it, editing "Netflix" without renaming would
 * always "find" a duplicate.
 *
 * Returns the matching subscription (there may be legitimately more than
 * one, e.g. two Netflix plans) or undefined when there's nothing to warn
 * about, including when `name` is blank.
 */
export const findDuplicateSubscriptionByName = (
    name: string,
    subscriptions: Subscription[],
    excludeId?: string,
): Subscription | undefined => {
    const normalized = normalizeSubscriptionName(name);
    if (!normalized) return undefined;

    return subscriptions.find(
        (subscription) =>
            subscription.id !== excludeId &&
            normalizeSubscriptionName(subscription.name) === normalized,
    );
};
