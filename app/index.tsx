import { Link } from "expo-router";
import { Text, View, TouchableOpacity } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text>Changes are live on my phone!</Text>
      <TouchableOpacity onPress={() => alert("Pressed!")}>
        <Text>Press me</Text>
      </TouchableOpacity>
      <Link
        href="/onboarding"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to onboarding
      </Link>
      <Link
        href="/(auth)/sign-in"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to Sing in
      </Link>
      <Link
        href="/(auth)/sign-up"
        className="mt-4 rounded bg-primary text-white p-4"
      >
        Go to Sign up
      </Link>
    </View>
  );
}
