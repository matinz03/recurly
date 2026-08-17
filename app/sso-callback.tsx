import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';

export default function SSOCallback() {
    const { isLoaded, isSignedIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoaded) return;

        // A cancelled or failed provider flow leaves isSignedIn false. Without
        // this branch the spinner renders forever, and the root Stack hides the
        // header so there's no way back.
        router.replace(isSignedIn ? '/' : '/(auth)/sign-in');
    }, [isLoaded, isSignedIn, router]);

    return (
        <View className="flex-1 items-center justify-center bg-background">
            <ActivityIndicator size="large" />
        </View>
    );
}
