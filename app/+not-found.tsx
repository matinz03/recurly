import { Link, usePathname, useGlobalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
    const pathname = usePathname();
    const params = useGlobalSearchParams();

    return (
        <View className="flex-1 items-center justify-center gap-3 bg-background p-5">
            <Text className="text-2xl font-sans-bold text-primary">Route not found</Text>

            {/* Shown so an unexpected deep link (e.g. an OAuth callback) is
                identifiable instead of just failing silently. */}
            <Text className="text-center text-sm font-sans-semibold text-primary">{pathname}</Text>

            {Object.keys(params).length > 0 && (
                <Text className="text-center text-xs font-sans-medium text-muted-foreground">
                    {JSON.stringify(params, null, 2)}
                </Text>
            )}

            <Link href="/" className="mt-4 font-sans-bold text-accent">
                Go home
            </Link>
        </View>
    );
}
