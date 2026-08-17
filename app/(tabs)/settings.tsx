import { Text, View, Pressable, Image } from 'react-native'
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useClerk, useUser } from '@clerk/expo';
import images from '@/constants/images';
import { useState } from 'react';
import clsx from 'clsx';
const SafeAreaView = styled(RNSafeAreaView);

const Settings = () => {
    const { signOut } = useClerk();
    const { user } = useUser();

    const [isSigningOut, setIsSigningOut] = useState(false);
    const [signOutError, setSignOutError] = useState<string | null>(null);

    const handleSignOut = async () => {
        if (isSigningOut) return;

        setSignOutError(null);
        setIsSigningOut(true);

        try {
            await signOut();
        } catch {
            setSignOutError('Could not sign out. Please try again.');
        } finally {
            setIsSigningOut(false);
        }
    };

    const displayName = user?.firstName || user?.fullName || user?.emailAddresses[0]?.emailAddress || 'User';
    const email = user?.emailAddresses[0]?.emailAddress;

    return (
        <SafeAreaView className="flex-1 bg-background p-5">
            <Text className="text-3xl font-sans-bold text-primary mb-6">Settings</Text>

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
        </SafeAreaView>
    )
}

export default Settings
