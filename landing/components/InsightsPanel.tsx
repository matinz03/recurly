/**
 * The Insights screen's summary tiles and category bars, at web scale.
 *
 * The figures are the same seven subscriptions the phone mockup shows, so the
 * two panels agree: $155.96/mo across five categories, and every derived number
 * here (yearly, average, each bar's share) follows from that one list.
 */

const MONTHLY = 155.96;
const COUNT = 7;

const CATEGORIES = [
    { name: 'Design', amount: 92.49, color: 'var(--color-cat-design)' },
    { name: 'Entertainment', amount: 21.48, color: 'var(--color-cat-entertainment)' },
    { name: 'AI Tools', amount: 20.0, color: 'var(--color-cat-ai)' },
    { name: 'Productivity', amount: 12.0, color: 'var(--color-cat-productivity)' },
    { name: 'Developer Tools', amount: 9.99, color: 'var(--color-cat-dev)' },
];

const usd = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function InsightsPanel() {
    return (
        <div className="panel p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row">
                <div className="insights-stat">
                    <p className="insights-stat-label">Monthly</p>
                    <p className="insights-stat-value">{usd(MONTHLY)}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{COUNT} active · USD</p>
                </div>
                <div className="insights-stat">
                    <p className="insights-stat-label">Yearly</p>
                    <p className="insights-stat-value">{usd(MONTHLY * 12)}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">at today’s cadence</p>
                </div>
                <div className="insights-stat">
                    <p className="insights-stat-label">Average</p>
                    <p className="insights-stat-value">{usd(MONTHLY / COUNT)}</p>
                    <p className="mt-1 text-xs font-medium text-muted-foreground">per subscription</p>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-lg font-bold text-primary">Spend by category</h3>

                <ul className="mt-5 flex flex-col gap-5">
                    {CATEGORIES.map((category) => (
                        <li key={category.name} className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-base font-semibold text-primary">{category.name}</span>
                                <span className="shrink-0 text-base font-bold text-primary">
                                    {usd(category.amount)}
                                </span>
                            </div>
                            {/* The app fills the track with the accent; here each bar
                                carries its own category wash so the legend is the bar. */}
                            <div className="insights-track">
                                <div
                                    className="insights-fill"
                                    style={{
                                        width: `${(category.amount / MONTHLY) * 100}%`,
                                        backgroundColor: category.color,
                                    }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
