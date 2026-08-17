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
