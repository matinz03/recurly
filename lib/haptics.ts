import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * expo-haptics is native-only. `app.json` sets `web.output: "static"`, so
 * `expo export` evaluates every module reachable from a route inside Node to
 * prerender pages (see lib/notifications.ts for the same guard against the
 * same failure mode). A missed haptic is never worth crashing UI code over,
 * so every export below also swallows its own rejection instead of letting
 * it surface as an unhandled promise.
 */
const isSupportedPlatform = Platform.OS !== 'web';

/** A card expanding - deliberately the lightest style available, since this
 * fires on a routine, frequent interaction rather than a rare one. */
export const impactExpand = (): void => {
    if (!isSupportedPlatform) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/** A subscription was created or saved. Success rather than impact, because
 * it confirms an outcome rather than acknowledging a touch. */
export const notifySuccess = (): void => {
    if (!isSupportedPlatform) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

/** A confirmed cancel or delete. Fires on the confirmation, not on opening the
 * dialog - a warning buzz for merely being asked a question is noise, and it
 * leaves the actual destructive moment silent. */
export const notifyDestructive = (): void => {
    if (!isSupportedPlatform) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
