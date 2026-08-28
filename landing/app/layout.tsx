import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * The app's own Plus Jakarta Sans files, copied from ../assets/fonts.
 *
 * The app registers five separate families because React Native can't
 * synthesise weights; on the web one family carrying five real weight files is
 * the equivalent, so `font-bold` here resolves to the same file the app loads as
 * `font-sans-bold`.
 */
const jakarta = localFont({
    src: [
        { path: './fonts/PlusJakartaSans-Regular.ttf', weight: '400', style: 'normal' },
        { path: './fonts/PlusJakartaSans-Medium.ttf', weight: '500', style: 'normal' },
        { path: './fonts/PlusJakartaSans-SemiBold.ttf', weight: '600', style: 'normal' },
        { path: './fonts/PlusJakartaSans-Bold.ttf', weight: '700', style: 'normal' },
        { path: './fonts/PlusJakartaSans-ExtraBold.ttf', weight: '800', style: 'normal' },
    ],
    variable: '--font-jakarta',
    display: 'swap',
});

const description =
    'A subscription tracker for Android. Track what you pay for, see when it renews, ' +
    'and see where the money actually goes. Your list stays on the device.';

export const metadata: Metadata = {
    title: 'Recurrly — know what you’re paying for',
    description,
    applicationName: 'Recurrly',
    openGraph: {
        title: 'Recurrly — know what you’re paying for',
        description,
        type: 'website',
        siteName: 'Recurrly',
    },
    twitter: { card: 'summary_large_image', title: 'Recurrly', description },
    icons: { icon: '/favicon.png', apple: '/favicon.png' },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#fff9e3' },
        { media: '(prefers-color-scheme: dark)', color: '#171310' },
    ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={jakarta.variable}>
            <body>{children}</body>
        </html>
    );
}
