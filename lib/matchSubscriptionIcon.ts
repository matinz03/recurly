import type { ImageSourcePropType } from 'react-native';
import type { SimpleIcon } from 'simple-icons';
import * as SimpleIcons from 'simple-icons';
import { icons, type IconKey } from '@/constants/icons';

// Brands we ship a real bundled logo for - checked before falling back to
// simple-icons, since a few well-known names (Adobe, Canva, OpenAI) aren't in
// that set, and "Canva" would otherwise fuzzy-match the unrelated "Canvas" icon.
const LOCAL_BRAND_ICONS: Array<{ key: IconKey; label: string }> = [
    { key: 'adobe', label: 'Adobe' },
    { key: 'canva', label: 'Canva' },
    { key: 'claude', label: 'Claude' },
    { key: 'dropbox', label: 'Dropbox' },
    { key: 'figma', label: 'Figma' },
    { key: 'github', label: 'GitHub' },
    { key: 'medium', label: 'Medium' },
    { key: 'netflix', label: 'Netflix' },
    { key: 'notion', label: 'Notion' },
    { key: 'openai', label: 'OpenAI' },
    { key: 'spotify', label: 'Spotify' },
];

const BRAND_ICONS = Object.values(SimpleIcons).filter(
    (value): value is SimpleIcon => typeof value === 'object' && value !== null && 'path' in value
);

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Checks the full name first ("Google Cloud"), then each individual word
// ("Spotify" out of "Spotify Premium") - never a partial/substring match,
// which is what lets "Canva" through without also matching "Canvas".
const nameCandidates = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return [...new Set([normalize(name), ...words.map(normalize)])].filter(Boolean);
};

export const matchSubscriptionIcon = (name: string): ImageSourcePropType | string | null => {
    const candidates = nameCandidates(name);
    if (candidates.length === 0) return null;

    for (const candidate of candidates) {
        const local = LOCAL_BRAND_ICONS.find(({ label }) => normalize(label) === candidate);
        if (local) return icons[local.key];
    }

    for (const candidate of candidates) {
        const brandIcon = BRAND_ICONS.find((icon) => normalize(icon.title) === candidate);
        if (brandIcon) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${brandIcon.hex}" d="${brandIcon.path}"/></svg>`;
        }
    }

    return null;
};
