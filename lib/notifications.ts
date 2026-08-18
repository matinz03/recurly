import dayjs from 'dayjs';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { usePreferencesStore } from '@/lib/preferencesStore';
import { formatCurrency, nextRenewalDate } from '@/lib/utils';

/**
 * Where reminders can actually run.
 *
 * Web: `app.json` sets `web.output: "static"`, so `expo export` evaluates every
 * module reachable from a route - including this one, via app/_layout.tsx -
 * inside Node to prerender pages, where there is no scheduler backend.
 *
 * Expo Go: importing expo-notifications pulls in
 * DevicePushTokenAutoRegistration.fx, a side-effect module that registers a
 * push-token listener and calls warnOfExpoGoPushUsage(). On Android that is a
 * `console.error`, which RN's dev overlay escalates to a red box - so merely
 * importing this module broke app boot in Expo Go. Remote push was removed
 * from Expo Go in SDK 53 anyway; reminders need a development build.
 */
const isSupportedPlatform = Platform.OS !== 'web' && !isRunningInExpoGo();

/**
 * Loaded on demand, never at module scope. A top-level import would run
 * expo-notifications' side-effect modules during app startup - including the
 * Expo Go push warning above - even on platforms where nothing here is usable.
 */
type NotificationsModule = typeof import('expo-notifications');
let cachedModule: NotificationsModule | undefined;

const loadNotifications = (): NotificationsModule | null => {
    if (!isSupportedPlatform) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule ??= require('expo-notifications') as NotificationsModule;
    return cachedModule;
};

/** Local hour the reminder fires at, on the lead day. */
const RENEWAL_REMINDER_HOUR = 9;

// How soon to fire a reminder whose ideal time already passed. Not immediate:
// rescheduling runs on every store change and app start, so an instant fire
// would be jarring and repeat. Note the tradeoff - once such a reminder has
// been delivered it is no longer "scheduled", so reopening the app inside the
// window can queue another. Tracking delivery would need persisted state.
const CATCH_UP_DELAY_MINUTES = 60;

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
    const Notifications = loadNotifications();
    if (!Notifications) return;

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
    const Notifications = loadNotifications();
    if (!Notifications || Platform.OS !== 'android') return;
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
    const Notifications = loadNotifications();
    if (!Notifications) return false;

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

    const now = dayjs();
    if (reminderDate.isAfter(now)) return { renewalDate, reminderDate };

    // The ideal reminder time has passed but the charge hasn't happened yet -
    // the case where a heads-up matters most. Previously this returned null, so
    // a plan renewing tomorrow produced no reminder at all. Fire shortly
    // instead, as long as that still lands before the renewal.
    const fallback = now.add(CATCH_UP_DELAY_MINUTES, 'minute');
    return fallback.isBefore(renewalDate) ? { renewalDate, reminderDate: fallback } : null;
};

const cancelOwnReminders = async (): Promise<void> => {
    const Notifications = loadNotifications();
    if (!Notifications) return;

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
const runScheduleRenewalReminders = async (subscriptions: Subscription[]): Promise<void> => {
    const Notifications = loadNotifications();
    if (!Notifications) return;

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

let pendingReschedule: Promise<void> = Promise.resolve();

/**
 * Serialises reschedules. Both store subscriptions fire on every set(), and the
 * runner above is a cancel-then-schedule sequence of awaits, so overlapping
 * runs interleave: run B's cancel sweep deletes what run A just scheduled,
 * leaving no reminders at all. Each run reads the arguments it was handed, so
 * the last one to finish still reflects the latest state.
 */
export const scheduleRenewalReminders = (subscriptions: Subscription[]): Promise<void> => {
    if (!isSupportedPlatform) return Promise.resolve();

    pendingReschedule = pendingReschedule
        .catch(() => {})
        .then(() => runScheduleRenewalReminders(subscriptions));
    return pendingReschedule;
};
