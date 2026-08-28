import { InsightsPanel } from '@/components/InsightsPanel';
import { Logo, Wordmark } from '@/components/Logo';
import { CTA_PATTERN, Pattern } from '@/components/Pattern';
import { PhoneHome } from '@/components/PhoneHome';
import {
    CardIcon,
    ChartIcon,
    ChevronDownIcon,
    DownloadIcon,
    GitHubIcon,
    LockIcon,
    PlusIcon,
    SearchIcon,
    SlidersIcon,
    WalletIcon,
} from '@/components/icons';
import { formatDate, formatSize, getLatestRelease, RELEASES_URL, REPO_URL } from '@/lib/release';

/** The release lookup is revalidated hourly; so is the page that renders it. */
export const revalidate = 3600;

const NAV_LINKS = [
    { href: '#features', label: 'Features' },
    { href: '#insights', label: 'Insights' },
    { href: '#privacy', label: 'Privacy' },
    { href: '#faq', label: 'FAQ' },
];

const FEATURES = [
    {
        icon: WalletIcon,
        wash: 'var(--color-cat-design)',
        title: 'The month at a glance',
        body: 'Home opens on committed monthly spend, the next five renewals as a carousel, and a short preview of the list. Anything renewing within a day reads “Today” or “Tomorrow” rather than a count.',
    },
    {
        icon: SearchIcon,
        wash: 'var(--color-cat-dev)',
        title: 'Search, filter, act',
        body: 'The full list, searchable and filterable by status. Tap a card to expand it in place for plan, payment method, renewal and start date — then Edit, Pause, Cancel or Delete without leaving it.',
    },
    {
        icon: ChartIcon,
        wash: 'var(--color-cat-ai)',
        title: 'Where the money goes',
        body: 'Monthly and yearly totals, average cost per subscription, spend by category, and your top five by monthly cost. Paused and cancelled plans stay out of every figure.',
    },
    {
        icon: PlusIcon,
        wash: 'var(--color-cat-productivity)',
        title: 'Type a name, get the brand',
        body: 'A drag-to-dismiss sheet that matches a brand icon as you type, from bundled art or a generated simple-icons subset. Pick a start date from a calendar, past or future.',
    },
    {
        icon: SlidersIcon,
        wash: 'var(--color-cat-entertainment)',
        title: 'Reminders before you’re billed',
        body: 'Renewal reminders with a lead time you choose. Plus light, system or dark to follow the OS, a base currency, and one control that clears everything stored.',
    },
    {
        icon: CardIcon,
        wash: '#d4d4d4',
        title: 'A label and four digits',
        body: 'Note which card paid for it — a name, and optionally the last four. Never a full number, never an expiry, never a CVC. The label is checked so a card number can’t be typed into it.',
    },
];

const LIMITATIONS = [
    'No screen-reader pass has been done, and large accessibility font sizes are untested — several rows are fixed-height and may clip.',
    'Renewal reminders need permission granted on first launch; nothing is scheduled if it’s declined.',
    'Amounts are never converted between currencies. Totals are grouped by currency and the app features the largest.',
    'Cancelling a subscription marks it — it doesn’t delete it. Delete is separate, and permanent.',
];

const FAQ = [
    {
        q: 'Is it on the Play Store?',
        a: 'Not yet. This is an alpha build for internal testing, distributed as an APK you sideload. Android will ask you to allow installs from unknown sources for whichever browser or file manager opens it.',
    },
    {
        q: 'Is there an iOS build?',
        a: 'Not distributed yet. The project is Expo, and the iOS target builds from source with EAS — the native identifiers and build profiles are already in the repo.',
    },
    {
        q: 'Do I need an account?',
        a: 'Yes. Clerk handles sign-in and it gates every tab. Your subscriptions are a separate matter — they’re stored on the device either way, and there is no backend for them.',
    },
    {
        q: 'Does it convert currencies?',
        a: 'No, deliberately. Recurrly does no FX conversion anywhere, so it never sums across currencies. Totals are grouped by currency, your largest is featured, and the rest are reported separately.',
    },
    {
        q: 'Can I build it myself?',
        a: 'Yes. Node 24 (pinned in .nvmrc), npm install, copy .env.example to .env and fill in the Clerk and PostHog keys, then npx expo start. Local notifications need a development build — they don’t fire in Expo Go.',
    },
];

export default async function Home() {
    const release = await getLatestRelease();
    const size = formatSize(release.apkSizeBytes);

    return (
        <>
            <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
                <div className="shell flex h-18 items-center justify-between gap-6">
                    <a href="#top" aria-label="Recurrly, home">
                        <Wordmark size={32} />
                    </a>

                    <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <a
                            href={REPO_URL}
                            className="hidden size-11 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted sm:flex"
                            aria-label="Recurrly on GitHub"
                        >
                            <GitHubIcon size={20} />
                        </a>
                        <a href="#download" className="btn-primary px-5 py-2.5 text-sm">
                            <DownloadIcon size={16} />
                            Download
                        </a>
                    </div>
                </div>
            </header>

            <main id="top">
                {/* ---------------------------------------------------------- Hero */}
                <section className="relative overflow-hidden pb-20 pt-14 lg:pb-28 lg:pt-20">
                    {/* Warm bloom behind the copy, in the accent. Decorative only. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -left-40 -top-40 size-[36rem] rounded-full opacity-25 blur-3xl"
                        style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 68%)' }}
                    />

                    <div className="shell relative grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-12">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="chip">
                                    <span className="size-2 rounded-full bg-accent" aria-hidden />
                                    {release.tag}
                                </span>
                                <span className="chip">Android</span>
                                <span className="chip border-accent/50 text-accent">Alpha</span>
                            </div>

                            <h1 className="mt-6 text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-primary sm:text-6xl lg:text-[4.25rem]">
                                Know what you’re
                                <br />
                                paying for.
                                <span className="block text-accent">Down to the renewal.</span>
                            </h1>

                            <p className="lede mt-7 max-w-xl">
                                Recurrly tracks what you subscribe to — the cost, the cadence, the day it
                                bills, and where the money actually goes. The list lives on your phone and
                                is never uploaded.
                            </p>

                            <div className="mt-9 flex flex-wrap items-center gap-4">
                                <a href={release.apkUrl} className="btn-primary">
                                    <DownloadIcon />
                                    Download for Android
                                </a>
                                <a href={REPO_URL} className="btn-outline">
                                    <GitHubIcon />
                                    View the source
                                </a>
                            </div>

                            <p className="mt-5 text-sm font-medium text-muted-foreground">
                                APK{size && ` · ${size}`} · Android 7.0 or later ·{' '}
                                <span className="whitespace-nowrap">alpha build, internal testing</span>
                            </p>
                        </div>

                        <PhoneHome />
                    </div>
                </section>

                {/* --------------------------------------------------- Fact strip */}
                <section className="shell">
                    <ul className="panel grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        {[
                            { icon: LockIcon, title: 'Stored on the device', body: 'No backend for your subscriptions, and no sync.' },
                            { icon: ChartIcon, title: 'No blended totals', body: 'Grouped by currency, never summed across them.' },
                            { icon: WalletIcon, title: 'Only what’s active', body: 'Paused and cancelled plans leave every figure.' },
                        ].map(({ icon: Icon, title, body }) => (
                            <li key={title} className="flex items-start gap-4 p-7">
                                <span className="mt-0.5 text-accent">
                                    <Icon size={22} />
                                </span>
                                <div>
                                    <p className="font-bold text-primary">{title}</p>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* ----------------------------------------------------- Features */}
                <section id="features" className="shell py-24 lg:py-32">
                    <p className="eyebrow">What’s inside</p>
                    <h2 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
                        Five screens, no filler.
                    </h2>
                    <p className="lede mt-5 max-w-2xl">
                        Every screen answers one question. Nothing is there to fill space, and nothing
                        that changes your money is more than a tap away.
                    </p>

                    <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, wash, title, body }) => (
                            <article key={title} className="feature-card">
                                {/* Fixed dark ink on the wash: these are the app's
                                    category colours, which stay light in both themes. */}
                                <span className="feature-swatch" style={{ backgroundColor: wash, color: '#081126' }}>
                                    <Icon size={22} />
                                </span>
                                <h3 className="feature-title">{title}</h3>
                                <p className="feature-body">{body}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* ----------------------------------------------------- Insights */}
                <section id="insights" className="shell pb-24 lg:pb-32">
                    <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
                        <div>
                            <p className="eyebrow">Insights</p>
                            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
                                Totals you can trust.
                            </h2>
                            <p className="lede mt-6">
                                Amounts are never summed across currencies. Recurrly groups by currency,
                                features your largest, and reports the rest separately — because it does no
                                FX conversion, and a blended figure would be a guess wearing a total’s
                                clothes.
                            </p>
                            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                                Only active subscriptions count. Pausing a plan takes it out of the totals
                                and out of Upcoming. Cancelling marks it without deleting it, because the
                                record is the history of what you used to pay for — and Delete is a separate,
                                permanent thing.
                            </p>

                            <a
                                href={`${REPO_URL}/blob/master/docs/DECISIONS.md`}
                                className="mt-8 inline-flex items-center gap-2 text-base font-bold text-accent hover:underline"
                            >
                                Read why it works this way
                                <span aria-hidden>→</span>
                            </a>
                        </div>

                        <InsightsPanel />
                    </div>
                </section>

                {/* ------------------------------------------------------ Privacy */}
                <section id="privacy" className="shell pb-24 lg:pb-32">
                    <div className="corner-xl bg-primary px-8 py-14 text-background sm:px-14 lg:px-20 lg:py-20">
                        <span className="flex size-12 items-center justify-center rounded-full bg-background/12 text-background">
                            <LockIcon size={22} />
                        </span>
                        <h2 className="mt-7 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                            Your list never leaves the phone.
                        </h2>
                        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-background/75">
                            Subscriptions are stored on the device. There is no backend for them and no
                            sync, so there is nothing to breach and nothing to export. Two services do use
                            the network, and it’s worth being plain about them.
                        </p>

                        <dl className="mt-12 grid gap-8 sm:grid-cols-3">
                            {[
                                ['Your subscriptions', 'On-device only. Never uploaded.'],
                                ['Clerk', 'Sign-in. Required to reach any tab.'],
                                ['PostHog', 'Product analytics. Nothing you track.'],
                            ].map(([term, detail]) => (
                                <div key={term} className="border-t border-background/20 pt-5">
                                    <dt className="text-xs font-semibold uppercase tracking-[1.5px] text-background/60">
                                        {term}
                                    </dt>
                                    <dd className="mt-2 text-base font-semibold">{detail}</dd>
                                </div>
                            ))}
                        </dl>

                        <p className="mt-10 max-w-2xl text-sm leading-relaxed text-background/60">
                            Card details are capped by design: a label and, if you want it, the last four
                            digits. No full number, no expiry, no CVC — and the label is validated so a
                            card number can’t be smuggled into it.
                        </p>
                    </div>
                </section>

                {/* ----------------------------------------------------- Download */}
                <section id="download" className="shell pb-24 lg:pb-32">
                    <div className="panel relative overflow-hidden">
                        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
                            <div className="p-8 sm:p-12 lg:p-14">
                                <p className="eyebrow">Download</p>
                                <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
                                    Get the Android build.
                                </h2>

                                <div className="mt-7 flex flex-wrap items-center gap-2">
                                    <span className="chip">
                                        <span className="size-2 rounded-full bg-success" aria-hidden />
                                        {release.tag}
                                    </span>
                                    {size && <span className="chip">{size}</span>}
                                    {release.publishedAt && (
                                        <span className="chip">{formatDate(release.publishedAt)}</span>
                                    )}
                                    <span className="chip">Android 7.0+</span>
                                </div>

                                <div className="mt-9 flex flex-wrap items-center gap-4">
                                    <a href={release.apkUrl} className="btn-primary">
                                        <DownloadIcon />
                                        Download {release.apkName}
                                    </a>
                                    <a href={release.releaseUrl} className="btn-outline">
                                        Release notes
                                    </a>
                                </div>

                                <ol className="mt-12 grid gap-6 sm:grid-cols-3">
                                    {[
                                        'Download the APK to your phone.',
                                        'Allow installs from unknown sources when Android prompts your browser or file manager.',
                                        'Open it, and grant notification permission on first launch if you want renewal reminders.',
                                    ].map((step, index) => (
                                        <li key={step} className="flex flex-col gap-3">
                                            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-extrabold text-primary">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                                        </li>
                                    ))}
                                </ol>

                                <details className="disclosure mt-10">
                                    <summary>
                                        Known limitations in this build
                                        <ChevronDownIcon className="chev" size={18} />
                                    </summary>
                                    <ul className="disclosure-body flex list-disc flex-col gap-2 pl-5">
                                        {LIMITATIONS.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </details>

                                <p className="mt-6 text-sm text-muted-foreground">
                                    No iOS build is distributed yet — the Expo project builds one from source
                                    with EAS.{' '}
                                    <a href={RELEASES_URL} className="font-semibold text-accent hover:underline">
                                        All releases →
                                    </a>
                                </p>
                            </div>

                            {/* The splash screen's tiles, closing the page on the
                                same motif the app opens on. */}
                            <div className="relative hidden min-h-full lg:block">
                                <Pattern
                                    rows={CTA_PATTERN}
                                    className="absolute inset-0 size-full"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ---------------------------------------------------------- FAQ */}
                <section id="faq" className="shell pb-24 lg:pb-32">
                    <div className="grid gap-14 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-20">
                        <div>
                            <p className="eyebrow">Questions</p>
                            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-primary">
                                Before you install.
                            </h2>
                        </div>

                        <div className="flex flex-col gap-4">
                            {FAQ.map(({ q, a }) => (
                                <details key={q} className="disclosure">
                                    <summary>
                                        {q}
                                        <ChevronDownIcon className="chev" size={18} />
                                    </summary>
                                    <p className="disclosure-body">{a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-border bg-card">
                <div className="shell grid gap-12 py-16 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
                    <div>
                        <Wordmark size={32} />
                        <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                            A subscription tracker built with Expo SDK 54, expo-router, NativeWind v5,
                            Clerk, zustand and PostHog.
                        </p>
                        <a href={release.apkUrl} className="btn-outline mt-7 px-5 py-2.5 text-sm">
                            <DownloadIcon size={16} />
                            {release.tag}
                        </a>
                    </div>

                    <div className="grid gap-10 sm:grid-cols-3">
                        {[
                            {
                                heading: 'Product',
                                links: [
                                    { label: 'Features', href: '#features' },
                                    { label: 'Insights', href: '#insights' },
                                    { label: 'Privacy', href: '#privacy' },
                                    { label: 'Download', href: '#download' },
                                ],
                            },
                            {
                                heading: 'Source',
                                links: [
                                    { label: 'Repository', href: REPO_URL },
                                    { label: 'Releases', href: RELEASES_URL },
                                    { label: 'Issues', href: `${REPO_URL}/issues` },
                                ],
                            },
                            {
                                heading: 'Docs',
                                links: [
                                    { label: 'Architecture', href: `${REPO_URL}/blob/master/docs/ARCHITECTURE.md` },
                                    { label: 'Decisions', href: `${REPO_URL}/blob/master/docs/DECISIONS.md` },
                                    { label: 'Data model', href: `${REPO_URL}/blob/master/docs/DATA-MODEL.md` },
                                    { label: 'Roadmap', href: `${REPO_URL}/blob/master/docs/ROADMAP.md` },
                                ],
                            },
                        ].map((column) => (
                            <div key={column.heading}>
                                <p className="text-xs font-semibold uppercase tracking-[1.5px] text-muted-foreground">
                                    {column.heading}
                                </p>
                                <ul className="mt-4 flex flex-col gap-3">
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <a
                                                href={link.href}
                                                className="text-sm font-semibold text-primary transition-opacity hover:opacity-65"
                                            >
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="shell flex flex-col gap-3 border-t border-border py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2">
                        <Logo size={16} />
                        Recurrly. Alpha software — expect rough edges.
                    </p>
                    <p>
                        Brand marks belong to their owners and are shown to identify subscriptions only.
                    </p>
                </div>
            </footer>
        </>
    );
}
