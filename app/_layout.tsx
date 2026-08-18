import { SplashScreen, Stack } from "expo-router";
import "@/global.css";
import { useFonts } from "expo-font";
import { useEffect, useRef } from "react";

import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { posthog } from "@/lib/posthog";
import { useRenewalReminders } from "@/lib/useRenewalReminders";
import { useThemePreference } from "@/lib/useThemePreference";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

function PostHogIdentity() {
  const posthogClient = usePostHog();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const wasSignedIn = useRef(false);
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      if (wasSignedIn.current) {
        posthogClient.reset();
        identifiedUserId.current = null;
      }
      wasSignedIn.current = false;
      return;
    }

    if (!user || identifiedUserId.current === user.id) return;

    if (identifiedUserId.current) {
      posthogClient.reset();
    }

    const personProperties = {
      ...(user.primaryEmailAddress?.emailAddress
        ? { email: user.primaryEmailAddress.emailAddress }
        : {}),
      ...(user.firstName ? { first_name: user.firstName } : {}),
      ...(user.lastName ? { last_name: user.lastName } : {}),
    };

    posthogClient.identify(user.id, { $set: personProperties });
    identifiedUserId.current = user.id;
    wasSignedIn.current = true;
  }, [isLoaded, isSignedIn, posthogClient, user]);

  return null;
}

function RootLayoutContent() {
  const [fontsLoaded, fontError] = useFonts({
    "sans-regular": require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "sans-bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
    "sans-medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "sans-semibold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "sans-extrabold": require("../assets/fonts/PlusJakartaSans-ExtraBold.ttf"),
  });
  const { isLoaded: authLoaded } = useAuth();
  const fontsReady = fontsLoaded || !!fontError;

  useRenewalReminders();
  useThemePreference();

  useEffect(() => {
    if (fontsReady && authLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady, authLoaded]);

  if (!fontsReady || !authLoaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const content = <RootLayoutContent />;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {posthog ? (
        <PostHogProvider client={posthog}>
          <PostHogIdentity />
          {content}
        </PostHogProvider>
      ) : content}
    </ClerkProvider>
  );
}
