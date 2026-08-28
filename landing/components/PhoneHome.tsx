import { Pattern, HERO_PATTERN } from './Pattern';

/**
 * The Home screen, rebuilt in HTML at the app's own dimensions (390pt wide) out
 * of the same component classes and spacing tokens.
 *
 * It is a recreation, not a screenshot: every app screen sits behind Clerk
 * sign-in, so there is nothing a browser can capture. Anything that is a real
 * device behaviour - the expand animation, the drag-to-dismiss sheet, the
 * carousel's momentum - is deliberately absent rather than faked.
 */

/** Fixed light-theme ink. The category washes below are data and stay light in
 *  both themes, so text on one of them can't use the theme-reactive token or it
 *  goes invisible the moment the page's ink flips for dark mode. */
const INK = '#081126';
const INK_MUTED = 'rgba(0, 0, 0, 0.6)';

const UPCOMING = [
    { brand: 'spotify', name: 'Spotify', price: '$5.99', renewal: 'Tomorrow' },
    { brand: 'notion', name: 'Notion', price: '$12.00', renewal: '4 days left' },
    { brand: 'figma', name: 'Figma', price: '$15.00', renewal: '6 days left' },
];

/** `wash` is the category colour from constants/categories.ts. */
const SUBSCRIPTIONS = [
    { brand: 'adobe', name: 'Adobe Creative Cloud', category: 'Design', price: '$77.49', billing: 'Monthly', wash: '#f5c542' },
    { brand: 'github', name: 'GitHub Pro', category: 'Developer Tools', price: '$9.99', billing: 'Monthly', wash: '#e8def8' },
    { brand: 'claude', name: 'Claude Pro', category: 'AI Tools', price: '$20.00', billing: 'Monthly', wash: '#b8d4e3' },
    { brand: 'netflix', name: 'Netflix', category: 'Entertainment', price: '$15.49', billing: 'Monthly', wash: '#ff6b6b' },
];

const TABS = [
    { glyph: 'home', label: 'Home', active: true },
    { glyph: 'wallet', label: 'Subscriptions', active: false },
    { glyph: 'activity', label: 'Insights', active: false },
    { glyph: 'setting', label: 'Settings', active: false },
];

/** The balance card shows the next renewal as MM/DD; Spotify renews tomorrow. */
function tomorrow(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${`${date.getMonth() + 1}`.padStart(2, '0')}/${`${date.getDate()}`.padStart(2, '0')}`;
}

function StatusBar() {
    return (
        <div className="flex h-11 items-center justify-between px-6 pt-1 text-xs font-bold text-primary">
            <span>9:41</span>
            <span className="flex items-center gap-1.5" aria-hidden>
                <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
                    <rect x="0" y="7" width="3" height="4" rx="0.8" />
                    <rect x="4.3" y="5" width="3" height="6" rx="0.8" />
                    <rect x="8.6" y="2.5" width="3" height="8.5" rx="0.8" />
                    <rect x="12.9" y="0" width="3" height="11" rx="0.8" />
                </svg>
                <svg width="22" height="11" viewBox="0 0 22 11" fill="none">
                    <rect x="0.6" y="0.6" width="17" height="9.8" rx="2.6" stroke="currentColor" strokeOpacity="0.5" />
                    <rect x="2.2" y="2.2" width="13" height="6.6" rx="1.5" fill="currentColor" />
                    <path d="M19.4 4v3a1.9 1.9 0 0 0 0-3Z" fill="currentColor" fillOpacity="0.5" />
                </svg>
            </span>
        </div>
    );
}

export function PhoneHome() {
    return (
        <div className="relative">
            {/* The splash-screen motif, bleeding out from behind the phone's top
                right. Cream tiles sit almost flush with the page ground, so what
                reads is the coral / amber / mint / navy accents. */}
            <Pattern
                rows={HERO_PATTERN}
                className="corner-xl pointer-events-none absolute -top-10 left-16 -z-10 h-[280px] w-[340px] opacity-90 sm:left-28"
            />

            <div
                className="relative mx-auto w-full max-w-[412px] rounded-[3.25rem] p-[11px] shadow-[0_40px_80px_-40px_rgba(8,17,38,0.55)]"
                style={{ backgroundColor: 'var(--color-nav-chrome)' }}
            >
                <div className="relative aspect-[390/810] overflow-hidden rounded-[2.6rem] bg-background">
                    <StatusBar />

                    {/* Pinned top right, where the app puts it - it doesn't
                        scroll away inside the list header. */}
                    <div className="absolute right-5 top-12 z-10 flex size-12 items-center justify-center rounded-full bg-muted">
                        <img src="/glyph/plus.png" alt="" width={24} height={24} className="size-6" />
                    </div>

                    {/* The app's SafeAreaView padding. Masked at the bottom so the
                        list runs out of view instead of ending on a hard crop. */}
                    <div className="fade-bottom h-[calc(100%-2.75rem)] px-5">
                        <div className="mb-2.5 flex items-center">
                            <div className="flex size-16 items-center justify-center rounded-full bg-accent text-xl font-bold text-background">
                                M
                            </div>
                            <p className="ml-4 text-2xl font-bold text-primary">Matin</p>
                        </div>

                        <div className="balance-card my-2.5">
                            <p className="balance-label">Monthly spend</p>
                            <div className="flex items-center justify-between">
                                <p className="balance-amount">$155.96</p>
                                <p className="text-xl font-medium text-white">{tomorrow()}</p>
                            </div>
                        </div>

                        <div className="mb-5">
                            <div className="list-head">
                                <h3 className="list-title">Upcoming</h3>
                                <span className="list-action">View all</span>
                            </div>

                            {/* Faded on the right rather than clipped: the real
                                carousel scrolls, and a hard edge would read as a
                                truncated card instead of more to come. */}
                            <div className="fade-right -mr-5 flex gap-4 pr-5">
                                {UPCOMING.map((item) => (
                                    <div key={item.brand} className="upcoming-card">
                                        <div className="flex items-center gap-3">
                                            <div className="upcoming-icon">
                                                <img src={`/brand/${item.brand}.png`} alt="" width={56} height={56} className="size-full" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="upcoming-price">{item.price}</p>
                                                <p className="upcoming-meta">{item.renewal}</p>
                                            </div>
                                        </div>
                                        <p className="upcoming-name">{item.name}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="list-head">
                            <h3 className="list-title">All Subscriptions</h3>
                            <span className="list-action">View all</span>
                        </div>

                        <div className="flex flex-col gap-4">
                            {SUBSCRIPTIONS.map((item) => (
                                <div key={item.brand} className="sub-card" style={{ backgroundColor: item.wash }}>
                                    <div className="sub-icon">
                                        <img src={`/brand/${item.brand}.png`} alt="" width={64} height={64} className="size-full" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="sub-title" style={{ color: INK }}>{item.name}</p>
                                        <p className="sub-meta" style={{ color: INK_MUTED }}>{item.category}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="sub-price" style={{ color: INK }}>{item.price}</p>
                                        <p className="sub-billing" style={{ color: INK_MUTED }}>{item.billing}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Fixed dark chrome in both themes: the tab glyphs are
                        baked-white PNGs with no runtime tint, so a bar that
                        inverted would swallow them. */}
                    <div
                        className="absolute inset-x-5 bottom-5 flex h-18 items-center justify-around rounded-[2rem]"
                        style={{ backgroundColor: 'var(--color-nav-chrome)' }}
                    >
                        {TABS.map((tab) => (
                            <div
                                key={tab.glyph}
                                className={`flex size-12 items-center justify-center rounded-full ${tab.active ? 'bg-accent' : ''}`}
                            >
                                <img src={`/glyph/${tab.glyph}.png`} alt="" width={24} height={24} className="size-6" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
