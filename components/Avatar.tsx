import { Image, Text, View } from 'react-native';
import { clsx } from 'clsx';

interface AvatarProps {
    /** Clerk's `user.imageUrl`, when there is one. */
    imageUrl?: string;
    /** Whatever the screen shows as the name - a first name, a full name, or an email. */
    name: string;
    /** Sizing and shape, so Home and Settings can differ. */
    className?: string;
}

/**
 * The signed-in user's picture, falling back to their initials.
 *
 * The fallback used to be a bundled illustration that shipped with the starter -
 * a stock character holding React and JS logos - which is not this user and not
 * this product. A monogram is always right: it's derived from the name already
 * on screen beside it, so it can't be someone else's face, and it needs no
 * asset at all.
 */
const initialsFrom = (name: string): string => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';

    // An email falls back to its first character rather than splitting on dots,
    // which would turn "first.last@example.com" into "FL@" nonsense.
    if (words.length === 1) return words[0][0].toUpperCase();

    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const Avatar = ({ imageUrl, name, className }: AvatarProps) => {
    if (imageUrl) {
        return (
            <Image
                source={{ uri: imageUrl }}
                className={clsx('avatar', className)}
                accessibilityLabel={`${name}'s picture`}
            />
        );
    }

    return (
        <View className={clsx('avatar avatar-fallback', className)}>
            {/* The name is already rendered next to this, so the monogram is
                decoration to a screen reader rather than a second announcement. */}
            <Text className="avatar-initials" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {initialsFrom(name)}
            </Text>
        </View>
    );
};

export default Avatar;
