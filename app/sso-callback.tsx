import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';

export default function SSOCallback() {
    const { isLoaded, isSignedIn } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.replace('/');
        }
    }, [isLoaded, isSignedIn, router]);

    return (
        <View className="flex-1 items-center justify-center bg-background">
            <ActivityIndicator size="large" />
        </View>
    );
}
