import { Text, View, Pressable, Image, Switch, ScrollView } from 'react-native'
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useClerk, useUser } from '@clerk/expo';
import images from '@/constants/images';
import { useThemeColors } from '@/constants/theme';
import { posthog } from '@/lib/posthog';
import { notifyDestructive } from '@/lib/haptics';
import { REMINDER_LEAD_DAY_OPTIONS, THEME_OPTIONS, usePreferencesStore, type ReminderLeadDays, type ThemePreference } from '@/lib/preferencesStore';
import { CURRENCIES } from '@/constants/currencies';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useSubscriptionStore } from '@/lib/subscriptionStore';
import { useState } from 'react';
import { clsx } from 'clsx';
const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
    const { signOut } = useClerk();
    const { user } = useUser();
    const colors = useThemeColors();

    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);

    const remindersEnabled = usePreferencesStore((state) => state.remindersEnabled);
    const reminderLeadDays = usePreferencesStore((state) => state.reminderLeadDays);
    const setRemindersEnabled = usePreferencesStore((state) => state.setRemindersEnabled);
    const setReminderLeadDays = usePreferencesStore((state) => state.setReminderLeadDays);
    const resetPreferences = usePreferencesStore((state) => state.resetPreferences);
    const clearSubscriptions = useSubscriptionStore((state) => state.clearSubscriptions);
    const baseCurrency = usePreferencesStore((state) => state.baseCurrency);
    const setBaseCurrency = usePreferencesStore((state) => state.setBaseCurrency);
    const themePreference = usePreferencesStore((state) => state.themePreference);
    const setThemePreference = usePreferencesStore((state) => state.setThemePreference);

    const handleSignOut = async () => {
        if (isSigningOut) return;

        setSignOutError(null);
        setIsSigningOut(true);

        try {
            await signOut();
            posthog?.capture('sign_out_completed');
        } catch {
            setSignOutError('Could not sign out. Please try again.');
        } finally {
            setIsSigningOut(false);
        }
    };

    const handleToggleReminders = (enabled: boolean) => {
        setRemindersEnabled(enabled);
        posthog?.capture('renewal_reminders_toggled', { enabled });
    };

    const handleSelectLeadDays = (days: ReminderLeadDays) => {
        setReminderLeadDays(days);
        posthog?.capture('renewal_reminder_lead_days_changed', { days });
    };

    // Destructive and irreversible - the copy names both stores explicitly so
    // "stored data" doesn't read as vaguer than it is, same reasoning
    // subscriptions.tsx's Cancel-vs-Delete copy gives for spelling out what's
    // actually lost.
    const [confirmingClear, setConfirmingClear] = useState(false);

    const handleClearData = () => {
        notifyDestructive();
        // Both stores clear by persisting an empty/default state rather than
        // removing the key - see clearSubscriptions for why the key-removal
        // route races and can resurrect the seed list.
        clearSubscriptions();
        resetPreferences();
        posthog?.capture('stored_data_cleared');
        setConfirmingClear(false);
    };

    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';
    const email = user?.emailAddresses[0]?.emailAddress;

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <Text className="text-3xl font-sans-bold text-primary mb-6">Settings</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-30">
            {/* User Profile Section */}
            <View className="auth-card mb-5">
                <View className="flex-row items-center gap-4 mb-4">
                    <Image
                        source={user?.imageUrl ? { uri: user.imageUrl } : images.avatar}
                        className="size-16 rounded-full"
                    />
                    <View className="flex-1">
                        <Text className="text-lg font-sans-bold text-primary">{displayName}</Text>
                        {email && (
                            <Text className="text-sm font-sans-medium text-muted-foreground">{email}</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Account Section */}
            <View className="auth-card mb-5">
                <Text className="text-base font-sans-semibold text-primary mb-3">Account</Text>
                <View className="gap-2">
                    <View className="flex-row justify-between items-center py-2">
                        <Text className="text-sm font-sans-medium text-muted-foreground">Account ID</Text>
                        <Text className="text-sm font-sans-medium text-primary" numberOfLines={1} ellipsizeMode="tail">
                            {user?.id?.substring(0, 20)}...
                        </Text>
                    </View>
                    <View className="flex-row justify-between items-center py-2">
                        <Text className="text-sm font-sans-medium text-muted-foreground">Joined</Text>
                        <Text className="text-sm font-sans-medium text-primary">
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </Text>
                    </View>
                </View>
            </View>

            <View className="auth-card mb-5">
                <Text className="text-base font-sans-semibold text-primary mb-3">Appearance</Text>
                <Text className="settings-row-helper mb-3">
                    System follows your device setting.
                </Text>
                <View className="picker-row" accessibilityRole="radiogroup">
                    {THEME_OPTIONS.map((option) => (
                        <Pressable
                            key={option}
                            className={clsx('picker-option', themePreference === option && 'picker-option-active')}
                            onPress={() => setThemePreference(option as ThemePreference)}
                            accessibilityRole="radio"
                            accessibilityLabel={option}
                            accessibilityState={{ selected: themePreference === option }}
                        >
                            <Text className={clsx('picker-option-text', themePreference === option && 'picker-option-text-active')}>
                                {option === 'system' ? 'System' : option === 'light' ? 'Light' : 'Dark'}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            <View className="auth-card mb-5">
                <Text className="text-base font-sans-semibold text-primary mb-3">Currency</Text>
                <Text className="settings-row-helper mb-3">
                    Amounts are entered and stored in this currency. Changing it doesn&apos;t convert
                    what you&apos;ve already saved.
                </Text>
                <View className="picker-row" accessibilityRole="radiogroup">
                    {CURRENCIES.map((option) => (
                        <Pressable
                            key={option}
                            className={clsx('picker-option', baseCurrency === option && 'picker-option-active')}
                            onPress={() => setBaseCurrency(option)}
                            accessibilityRole="radio"
                            accessibilityLabel={option}
                            accessibilityState={{ selected: baseCurrency === option }}
                        >
                            <Text className={clsx('picker-option-text', baseCurrency === option && 'picker-option-text-active')}>
                                {option}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Renewal Reminders Section */}
            <View className="auth-card mb-5">
                <Text className="text-base font-sans-semibold text-primary mb-3">Renewal Reminders</Text>

                <View className="settings-row">
                    <View className="settings-row-copy">
                        <Text className="settings-row-label">Reminders</Text>
                        <Text className="settings-row-helper">
                            A local notification before each active renewal.
                        </Text>
                    </View>
                    <Switch
                        value={remindersEnabled}
                        onValueChange={handleToggleReminders}
                        trackColor={{ false: colors.muted, true: colors.accent }}
                        thumbColor={colors.background}
                        ios_backgroundColor={colors.muted}
                        accessibilityLabel="Renewal reminders"
                    />
                </View>

                {remindersEnabled && (
                    <>
                        <View className="settings-divider" />
                        <Text className="settings-row-label mb-3">Remind me</Text>
                        <View className="picker-row">
                            {REMINDER_LEAD_DAY_OPTIONS.map((days) => {
                                const active = reminderLeadDays === days;
                                return (
                                    <Pressable
                                        key={days}
                                        className={clsx('picker-option', active && 'picker-option-active')}
                                        onPress={() => handleSelectLeadDays(days)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Remind me ${days} day${days === 1 ? '' : 's'} before renewal`}
                                        accessibilityState={{ selected: active }}
                                    >
                                        <Text className={clsx('picker-option-text', active && 'picker-option-text-active')}>
                                            {days} {days === 1 ? 'day' : 'days'}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </>
                )}
            </View>

            {/* Data Section */}
            <View className="auth-card mb-5">
                <Text className="text-base font-sans-semibold text-primary mb-3">Data</Text>
                <Text className="settings-row-helper mb-3">
                    Removes every subscription and preference saved on this device.
                </Text>
                <Pressable className="settings-danger-button" onPress={() => setConfirmingClear(true)}>
                    <Text className="settings-danger-button-text">Clear Stored Data</Text>
                </Pressable>
            </View>

            {/* Sign Out Button */}
            {signOutError && <Text className="auth-error mb-2">{signOutError}</Text>}
            <Pressable
                className={clsx('auth-button bg-destructive', isSigningOut && 'auth-button-disabled')}
                onPress={handleSignOut}
                disabled={isSigningOut}
            >
                <Text className="auth-button-text text-white">
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                </Text>
            </Pressable>
            </ScrollView>

            <ConfirmDialog
                visible={confirmingClear}
                title="Clear all stored data?"
                message="This deletes every subscription on this device along with your reminder settings, and there's no undo. You'll start again with an empty list."
                confirmLabel="Clear data"
                destructive
                onCancel={() => setConfirmingClear(false)}
                onConfirm={handleClearData}
            />
        </SafeAreaView>
    )
}

export default Settings
