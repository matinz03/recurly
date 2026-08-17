import dayjs from 'dayjs';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { usePreferencesStore } from '@/lib/preferencesStore';
import { formatCurrency, nextRenewalDate } from '@/lib/utils';

/**
 * expo-notifications is native-only. `app.json` sets `web.output: "static"`,
 * so `expo export` evaluates every module reachable from a route - including
 * this one, via app/_layout.tsx - inside Node to prerender pages. There is no
 * scheduler backend there (or in a real web build), so every exported
 * function below checks this first and returns before calling into the
 * module. A persist backend touching `window` unconditionally broke `expo
 * export` once already (see lib/subscriptionStore.ts); this is the same
 * failure mode guarded the same way.
 */
const isSupportedPlatform = Platform.OS !== 'web';

/** Local hour the reminder fires at, on the lead day. */
const RENEWAL_REMINDER_HOUR = 9;

const ANDROID_CHANNEL_ID = 'renewal-reminders';

// Stamped into every reminder's `content.data`. `getAllScheduledNotificationsAsync`
// returns everything scheduled - including anything a future feature or a
// previous install left behind - so cancellation filters on this rather than
// assuming the whole list belongs to us.
const REMINDER_SOURCE = 'recurly-renewal-reminder';

const reminderIdentifier = (subscriptionId: string) => `renewal-reminder:${subscriptionId}`;

/**
 * Shows a foreground notification instead of the expo-notifications default
 * of silently discarding it. Safe to call repeatedly - it just replaces the
 * previous handler.
 */
export const configureNotificationHandler = (): void => {
    if (!isSupportedPlatform) return;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
        }),
    });
};

// Android 8+ refuses to show a notification with no channel. iOS ignores
// channelId entirely, so this is a no-op there (the native module's own web
// stub also no-ops, but this only runs on native per isSupportedPlatform).
const ensureAndroidChannel = async (): Promise<void> => {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Renewal reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
    });
};

/**
 * Checks current permission first and only prompts if the OS will still take
 * "no" for an answer - never re-prompts after an explicit denial. Callers are
 * expected to call this only once there's an actual reminder to schedule, so
 * the request lands the first time it means something instead of on cold
 * boot with an empty subscription list.
 */
const ensurePermissionAsync = async (): Promise<boolean> => {
    try {
        const current = await Notifications.getPermissionsAsync();
        if (current.granted) return true;
        if (!current.canAskAgain) return false;

        const requested = await Notifications.requestPermissionsAsync();
        return requested.granted;
    } catch (error) {
        console.warn('[notifications] permission check failed:', error);
        return false;
    }
};

interface ReminderTiming {
    renewalDate: dayjs.Dayjs;
    reminderDate: dayjs.Dayjs;
}

/**
 * The renewal (rolled forward, per `nextRenewalDate`) and reminder time for
 * one subscription, or null when there's nothing useful to schedule: no
 * parseable renewal date, or the renewal is already closer than `leadDays`
 * (rolling forward can't put a reminder in the past, and firing it
 * "immediately" would misrepresent the promise of a heads-up before the
 * charge).
 */
const reminderTimingFor = (subscription: Subscription, leadDays: number): ReminderTiming | null => {
    const renewalDate = nextRenewalDate(subscription.renewalDate, subscription.billing);
    if (!renewalDate) return null;

    const reminderDate = renewalDate
        .subtract(leadDays, 'day')
        .hour(RENEWAL_REMINDER_HOUR)
        .minute(0)
        .second(0)
        .millisecond(0);

    return reminderDate.isAfter(dayjs()) ? { renewalDate, reminderDate } : null;
};

const cancelOwnReminders = async (): Promise<void> => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const ours = scheduled.filter((request) => request.content.data?.source === REMINDER_SOURCE);
    await Promise.all(ours.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
};

/**
 * Cancels every reminder this module previously scheduled and schedules a
 * fresh one per active subscription that's due within the lead window. Meant
 * to be called on every subscription-store *and* preferences-store change
 * (see lib/useRenewalReminders.ts) as well as on app start, so
 * cancel-then-recreate is deliberate: it's the only way to avoid piling up
 * duplicates across however many times this runs in a session, and it's also
 * what makes the reminders master switch actually take effect immediately
 * (see the early return below) instead of only on the next subscription edit.
 */
export const scheduleRenewalReminders = async (subscriptions: Subscription[]): Promise<void> => {
    if (!isSupportedPlatform) return;

    const { remindersEnabled, reminderLeadDays } = usePreferencesStore.getState();

    try {
        await cancelOwnReminders();
    } catch (error) {
        console.warn('[notifications] failed to clear previous renewal reminders:', error);
        return;
    }

    // The master switch is off - leave everything cancelled above and stop,
    // rather than leaving stale reminders queued from before it was flipped.
    if (!remindersEnabled) return;

    const candidates = subscriptions
        .filter((subscription) => subscription.status?.toLowerCase() === 'active')
        .map((subscription) => ({ subscription, timing: reminderTimingFor(subscription, reminderLeadDays) }))
        .filter(
            (candidate): candidate is { subscription: Subscription; timing: ReminderTiming } =>
                candidate.timing !== null
        );

    // Nothing to remind about - stop here rather than prompting for
    // permission with no payoff (the classic cold-boot mistake).
    if (candidates.length === 0) return;

    const granted = await ensurePermissionAsync();
    if (!granted) return; // Denied, or unavailable on this platform - degrade silently.

    await ensureAndroidChannel();

    for (const { subscription, timing } of candidates) {
        try {
            await Notifications.scheduleNotificationAsync({
                identifier: reminderIdentifier(subscription.id),
                content: {
                    title: `${subscription.name} renews soon`,
                    body: `${formatCurrency(subscription.price, subscription.currency)} renews on ${timing.renewalDate.format('MMM D')}.`,
                    data: { source: REMINDER_SOURCE, subscriptionId: subscription.id },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: timing.reminderDate.toDate(),
                    ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
                },
            });
        } catch (error) {
            console.warn(`[notifications] failed to schedule reminder for ${subscription.id}:`, error);
        }
    }
};
