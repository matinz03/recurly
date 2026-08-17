import { Link, usePathname, useGlobalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFound() {
    const pathname = usePathname();
    const params = useGlobalSearchParams();
    const paramKeys = Object.keys(params);

    return (
        <View className="flex-1 items-center justify-center gap-3 bg-background p-5">
            <Text className="text-2xl font-sans-bold text-primary">Route not found</Text>

            {/* Diagnostics are dev-only, and only parameter names are shown -
                deep-link query values can carry tokens. */}
            {__DEV__ && (
                <>
                    <Text className="text-center text-sm font-sans-semibold text-primary">
                        {pathname}
                    </Text>
                    {paramKeys.length > 0 && (
                        <Text className="text-center text-xs font-sans-medium text-muted-foreground">
                            params: {paramKeys.join(', ')}
                        </Text>
                    )}
                </>
            )}

            <Link href="/" className="mt-4 font-sans-bold text-accent">
                Go home
            </Link>
        </View>
    );
}
