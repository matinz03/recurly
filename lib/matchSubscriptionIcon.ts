import type { ImageSourcePropType } from 'react-native';
import { BRAND_ICONS } from '@/constants/brandIcons';
import { icons, type IconKey } from '@/constants/icons';

// Brands we ship a real bundled logo for - checked before the generated
// simple-icons subset, since several well-known names (Adobe, Canva, OpenAI)
// were removed from that set for trademark reasons.
const LOCAL_BRAND_ICONS: Record<string, IconKey> = {
    adobe: 'adobe',
    adobecreativecloud: 'adobe',
    canva: 'canva',
    claude: 'claude',
    dropbox: 'dropbox',
    figma: 'figma',
    github: 'github',
    medium: 'medium',
    netflix: 'netflix',
    notion: 'notion',
    openai: 'openai',
    chatgpt: 'openai',
    spotify: 'spotify',
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Checks the full name first ("Google Cloud"), then each individual word
// ("Spotify" out of "Spotify Premium") - never a partial/substring match,
// which is what lets "Canva" through without also matching "Canvas".
const nameCandidates = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return [...new Set([normalize(name), ...words.map(normalize)])].filter(Boolean);
};

/**
 * Best-effort icon for a subscription name. Returns a bundled image source, a
 * raw SVG string, or null when nothing matches. Both lookups are keyed object
 * hits rather than scans, so this is cheap enough to call on every keystroke.
 */
export const matchSubscriptionIcon = (name: string): ImageSourcePropType | string | null => {
    const candidates = nameCandidates(name);

    for (const candidate of candidates) {
        const localKey = LOCAL_BRAND_ICONS[candidate];
        if (localKey) return icons[localKey];
    }

    for (const candidate of candidates) {
        const brandIcon = BRAND_ICONS[candidate];
        if (brandIcon) {
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#${brandIcon.hex}" d="${brandIcon.path}"/></svg>`;
        }
    }

    return null;
};
