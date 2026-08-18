import { matchSubscriptionIcon } from '@/lib/matchSubscriptionIcon';
import { icons } from '@/constants/icons';

describe('matchSubscriptionIcon', () => {
    it('returns null when nothing matches', () => {
        expect(matchSubscriptionIcon('Local Gym Membership')).toBeNull();
    });

    it('returns null for an empty name', () => {
        expect(matchSubscriptionIcon('')).toBeNull();
        expect(matchSubscriptionIcon('   ')).toBeNull();
    });

    it('prefers a bundled logo over the generated set', () => {
        // Adobe, Canva and OpenAI were removed from simple-icons for trademark
        // reasons, so the bundled assets are the only match for them - and for
        // the brands present in both, the real asset is the better one.
        expect(matchSubscriptionIcon('Netflix')).toBe(icons.netflix);
        expect(matchSubscriptionIcon('Adobe')).toBe(icons.adobe);
        expect(matchSubscriptionIcon('Canva')).toBe(icons.canva);
    });

    it('maps a product alias to its brand asset', () => {
        expect(matchSubscriptionIcon('ChatGPT')).toBe(icons.openai);
        expect(matchSubscriptionIcon('Adobe Creative Cloud')).toBe(icons.adobe);
    });

    it('ignores case, spacing and punctuation', () => {
        expect(matchSubscriptionIcon('  net-flix  ')).toBe(icons.netflix);
        expect(matchSubscriptionIcon('NETFLIX')).toBe(icons.netflix);
    });

    it('matches a brand word inside a plan name', () => {
        expect(matchSubscriptionIcon('Spotify Premium Duo')).toBe(icons.spotify);
        expect(matchSubscriptionIcon('Family Netflix plan')).toBe(icons.netflix);
    });

    it('does not match on a partial word', () => {
        // "Canvas" is a different product, and a substring match would hand it
        // Canva's logo. Matching is per whole word for exactly this reason.
        expect(matchSubscriptionIcon('Canvas')).toBeNull();
        expect(matchSubscriptionIcon('Notionary')).toBeNull();
    });

    it('returns renderable SVG markup for a generated brand', () => {
        const result = matchSubscriptionIcon('Vercel');

        expect(typeof result).toBe('string');
        const markup = result as string;
        expect(markup).toContain('<svg');
        expect(markup).toContain('viewBox="0 0 24 24"');
        expect(markup).toMatch(/fill="#[0-9a-fA-F]{3,8}"/);
        expect(markup).toMatch(/ d="[^"]+"/);
    });

    it('matches the full name before its individual words', () => {
        // "GitHub Copilot" is its own brand with its own mark in the generated
        // set. GitHub also has a bundled asset, and the second word used to win
        // because the bundled map was swept across every candidate first.
        const result = matchSubscriptionIcon('GitHub Copilot');

        expect(typeof result).toBe('string');
        expect(result).not.toBe(icons.github);
    });

    it('still prefers a bundled asset over the generated one for the same name', () => {
        // Same candidate, two sources: the real asset wins.
        expect(matchSubscriptionIcon('GitHub')).toBe(icons.github);
        expect(matchSubscriptionIcon('Notion')).toBe(icons.notion);
    });

    it('falls back to a word when the full name is unknown', () => {
        expect(matchSubscriptionIcon('Vercel Pro Plan')).toBe(matchSubscriptionIcon('Vercel'));
    });
});
