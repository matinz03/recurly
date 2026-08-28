/**
 * The download button's target comes from the GitHub Releases API so it can't
 * go stale when a new build ships, with the current release pinned below as a
 * fallback: the API is rate-limited per IP (60/hr unauthenticated) and offline
 * local dev has no network at all, and neither case should leave the page
 * without a working download link.
 */

const REPO = 'matinz03/recurly';

export const REPO_URL = `https://github.com/${REPO}`;
export const RELEASES_URL = `${REPO_URL}/releases`;

export interface Release {
    tag: string;
    /** Direct link to the .apk asset. */
    apkUrl: string;
    apkName: string;
    apkSizeBytes: number;
    publishedAt: string;
    releaseUrl: string;
    /** True when the pinned values below are being served. */
    pinned: boolean;
}

/** v1.0.0-alpha.1, the first sideloadable Android build. */
const PINNED: Release = {
    tag: 'v1.0.0-alpha.1',
    apkUrl: `${RELEASES_URL}/download/v1.0.0-alpha.1/z03.recurly.apk`,
    apkName: 'z03.recurly.apk',
    apkSizeBytes: 107_975_218,
    publishedAt: '2026-08-18T11:51:08Z',
    releaseUrl: `${RELEASES_URL}/tag/v1.0.0-alpha.1`,
    pinned: true,
};

interface GitHubAsset {
    name?: string;
    size?: number;
    browser_download_url?: string;
}

interface GitHubRelease {
    tag_name?: string;
    published_at?: string;
    html_url?: string;
    assets?: GitHubAsset[];
}

export async function getLatestRelease(): Promise<Release> {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
            headers: { Accept: 'application/vnd.github+json' },
            // Re-checked hourly rather than per request, so a burst of traffic
            // can't spend the unauthenticated rate limit.
            next: { revalidate: 3600 },
        });

        if (!response.ok) return PINNED;

        const release = (await response.json()) as GitHubRelease;
        const apk = release.assets?.find((asset) => asset.name?.endsWith('.apk'));

        // A release with no .apk (a tag cut before the build finished, say) is
        // not something to link to - keep the last known-good download.
        if (!apk?.browser_download_url || !release.tag_name) return PINNED;

        return {
            tag: release.tag_name,
            apkUrl: apk.browser_download_url,
            apkName: apk.name ?? PINNED.apkName,
            apkSizeBytes: apk.size ?? 0,
            publishedAt: release.published_at ?? '',
            releaseUrl: release.html_url ?? RELEASES_URL,
            pinned: false,
        };
    } catch {
        return PINNED;
    }
}

/** Binary megabytes, the unit GitHub shows next to the asset. */
export function formatSize(bytes: number): string {
    if (!bytes) return '';
    return `${Math.round(bytes / 1024 / 1024)} MB`;
}

export function formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}
