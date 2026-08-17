import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, useRouter, type Href } from 'expo-router';
import { useSignIn, useSSO } from '@clerk/expo';
import { useState } from 'react';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import * as Linking from 'expo-linking';
import { AntDesign } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { posthog } from '@/lib/posthog';
import clsx from 'clsx';

const SafeAreaView = styled(RNSafeAreaView);

const SSO_PROVIDERS = [
    { strategy: 'oauth_google', icon: 'google', label: 'Google' },
    { strategy: 'oauth_apple', icon: 'apple', label: 'Apple' },
    { strategy: 'oauth_github', icon: 'github', label: 'GitHub' },
] as const;

const SignIn = () => {
    const { signIn, errors, fetchStatus } = useSignIn();
    const { startSSOFlow } = useSSO();
    const router = useRouter();

    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [ssoStrategy, setSsoStrategy] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    // Validation states
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    // Client-side validation
    const emailValid = emailAddress.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
    const passwordValid = password.length > 0;
    const formValid = emailAddress.length > 0 && password.length > 0 && emailValid;

    const handleSubmit = async () => {
        if (!formValid) return;

        setFormError(null);

        // Clerk surfaces failures through errors.fields / errors.global, which the
        // form renders - don't echo error.message here or it shows up twice.
        const { error } = await signIn.password({
            emailAddress,
            password,
        });

        if (error) return;

        if (signIn.status === 'complete') {
            await signIn.finalize({
                navigate: ({ session, decorateUrl }) => {
                    if (session?.currentTask) {
                        console.log(session?.currentTask);
                        return;
                    }

                    const url = decorateUrl('/(tabs)');
                    if (url.startsWith('http')) {
                        // React Native has no window.location - assigning to it throws.
                        Linking.openURL(url).catch(() => {});
                    } else {
                        router.replace(url as Href);
                    }
                },
            });
            posthog?.capture('sign_in_completed', { method: 'password' });
        } else if (signIn.status === 'needs_second_factor') {
            // MFA isn't implemented in this flow, so say so rather than stalling.
            setFormError('This account requires two-factor authentication, which is not supported yet.');
        } else if (signIn.status === 'needs_client_trust') {
            // Populated only once the first factor is verified, and the legacy
            // resource types it as nullable - so don't assume an array.
            const emailCodeFactor = signIn.supportedSecondFactors?.find(
                (factor) => factor.strategy === 'email_code'
            );

            if (!emailCodeFactor) {
                setFormError('Could not verify this device. Please try again.');
                return;
            }

            await signIn.mfa.sendEmailCode();
        } else {
            setFormError('Could not complete sign-in. Please try again.');
        }
    };

    const handleSSO = async (strategy: (typeof SSO_PROVIDERS)[number]['strategy']) => {
        setFormError(null);
        setSsoStrategy(strategy);

        try {
            const { createdSessionId, setActive, authSessionResult, signUp } =
                await startSSOFlow({ strategy });

            if (createdSessionId && setActive) {
                await setActive({ session: createdSessionId });
                posthog?.capture('sign_in_completed', { method: 'sso' });
            } else if (authSessionResult?.type !== 'cancel' && authSessionResult?.type !== 'dismiss') {
                // A first-time SSO user is transferred into signUp.create({ transfer: true }).
                // That can't complete if the instance requires fields the provider doesn't
                // supply, which leaves no session - so name them rather than guess.
                const missing = signUp?.missingFields ?? [];

                setFormError(
                    missing.length > 0
                        ? `This provider didn't supply required field(s): ${missing.join(', ')}. Make them optional in the Clerk Dashboard.`
                        : 'Could not complete sign-in with that provider. Please try again.'
                );
            }
        } catch (err) {
            console.error(JSON.stringify(err, null, 2));
            setFormError('Something went wrong. Please try again.');
        } finally {
            setSsoStrategy(null);
        }
    };

    const handleVerify = async () => {
        setFormError(null);

        const { error } = await signIn.mfa.verifyEmailCode({ code });

        if (error) return;

        if (signIn.status === 'complete') {
            await signIn.finalize({
                navigate: ({ session, decorateUrl }) => {
                    if (session?.currentTask) {
                        console.log(session?.currentTask);
                        return;
                    }

                    const url = decorateUrl('/(tabs)');
                    if (url.startsWith('http')) {
                        // React Native has no window.location - assigning to it throws.
                        Linking.openURL(url).catch(() => {});
                    } else {
                        router.replace(url as Href);
                    }
                },
            });
            posthog?.capture('sign_in_completed', { method: 'email_code' });
        } else {
            setFormError('Could not complete sign-in. Please try again.');
        }
    };

    const handleResend = async () => {
        setFormError(null);
        await signIn.mfa.sendEmailCode();
    };

    // Show verification screen if client trust is needed
    if (signIn.status === 'needs_client_trust') {
        return (
            <SafeAreaView className="auth-safe-area">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="auth-screen"
                >
                    <ScrollView
                        className="auth-scroll"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="auth-content">
                            {/* Branding */}
                            <View className="auth-brand-block">
                                <View className="auth-logo-wrap">
                                    <View className="auth-logo-mark">
                                        <Text className="auth-logo-mark-text">R</Text>
                                    </View>
                                    <View>
                                        <Text className="auth-wordmark">Recurrly</Text>
                                        <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                    </View>
                                </View>
                                <Text className="auth-title">Verify your identity</Text>
                                <Text className="auth-subtitle">
                                    We sent a verification code to your email
                                </Text>
                            </View>

                            {/* Verification Form */}
                            <View className="auth-card">
                                <View className="auth-form">
                                    <View className="auth-field">
                                        <Text className="auth-label">Verification Code</Text>
                                        <TextInput
                                            className="auth-input"
                                            value={code}
                                            placeholder="Enter 6-digit code"
                                            placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                            onChangeText={setCode}
                                            keyboardType="number-pad"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                        />
                                        {errors.fields.code && (
                                            <Text className="auth-error">{errors.fields.code.message}</Text>
                                        )}
                                    </View>

                                    {formError && <Text className="auth-error">{formError}</Text>}
                                    {errors.global?.map((err, i) => (
                                        <Text key={i} className="auth-error">{err.message}</Text>
                                    ))}

                                    <Pressable
                                        className={clsx('auth-button', (!code || fetchStatus === 'fetching') && 'auth-button-disabled')}
                                        onPress={handleVerify}
                                        disabled={!code || fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-button-text">
                                            {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        className="auth-secondary-button"
                                        onPress={handleResend}
                                        disabled={fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-secondary-button-text">Resend Code</Text>
                                    </Pressable>

                                    <Pressable
                                        className="auth-secondary-button"
                                        onPress={() => signIn.reset()}
                                        disabled={fetchStatus === 'fetching'}
                                    >
                                        <Text className="auth-secondary-button-text">Start Over</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    // Main sign-in form
    return (
        <SafeAreaView className="auth-safe-area">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="auth-screen"
            >
                <ScrollView
                    className="auth-scroll"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View className="auth-content">
                        {/* Branding */}
                        <View className="auth-brand-block">
                            <View className="auth-logo-wrap">
                                <View className="auth-logo-mark">
                                    <Text className="auth-logo-mark-text">R</Text>
                                </View>
                                <View>
                                    <Text className="auth-wordmark">Recurrly</Text>
                                    <Text className="auth-wordmark-sub">SUBSCRIPTIONS</Text>
                                </View>
                            </View>
                            <Text className="auth-title">Welcome back</Text>
                            <Text className="auth-subtitle">
                                Sign in to continue managing your subscriptions
                            </Text>
                        </View>

                        {/* Sign-In Form */}
                        <View className="auth-card">
                            <View className="auth-form">
                                <View className="auth-field">
                                    <Text className="auth-label">Email Address</Text>
                                    <TextInput
                                        className={clsx('auth-input', emailTouched && !emailValid && 'auth-input-error')}
                                        autoCapitalize="none"
                                        value={emailAddress}
                                        placeholder="name@example.com"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        onChangeText={setEmailAddress}
                                        onBlur={() => setEmailTouched(true)}
                                        keyboardType="email-address"
                                        autoComplete="email"
                                    />
                                    {emailTouched && !emailValid && (
                                        <Text className="auth-error">Please enter a valid email address</Text>
                                    )}
                                    {errors.fields.identifier && (
                                        <Text className="auth-error">{errors.fields.identifier.message}</Text>
                                    )}
                                </View>

                                <View className="auth-field">
                                    <Text className="auth-label">Password</Text>
                                    <TextInput
                                        className={clsx('auth-input', passwordTouched && !passwordValid && 'auth-input-error')}
                                        value={password}
                                        placeholder="Enter your password"
                                        placeholderTextColor="rgba(0, 0, 0, 0.4)"
                                        secureTextEntry
                                        onChangeText={setPassword}
                                        onBlur={() => setPasswordTouched(true)}
                                        autoComplete="password"
                                    />
                                    {passwordTouched && !passwordValid && (
                                        <Text className="auth-error">Password is required</Text>
                                    )}
                                    {errors.fields.password && (
                                        <Text className="auth-error">{errors.fields.password.message}</Text>
                                    )}
                                </View>

                                {formError && <Text className="auth-error">{formError}</Text>}
                                {errors.global?.map((err, i) => (
                                    <Text key={i} className="auth-error">{err.message}</Text>
                                ))}

                                <Pressable
                                    className={clsx('auth-button', (!formValid || fetchStatus === 'fetching') && 'auth-button-disabled')}
                                    onPress={handleSubmit}
                                    disabled={!formValid || fetchStatus === 'fetching'}
                                >
                                    <Text className="auth-button-text">
                                        {fetchStatus === 'fetching' ? 'Signing In...' : 'Sign In'}
                                    </Text>
                                </Pressable>

                                {/* SSO Providers */}
                                <View className="auth-divider-row">
                                    <View className="auth-divider-line" />
                                    <Text className="auth-divider-text">Or continue with</Text>
                                    <View className="auth-divider-line" />
                                </View>

                                <View className="flex-row gap-3">
                                    {SSO_PROVIDERS.map(({ strategy, icon, label }) => (
                                        <Pressable
                                            key={strategy}
                                            className="flex-1 items-center justify-center rounded-2xl border border-border bg-background py-4"
                                            onPress={() => handleSSO(strategy)}
                                            disabled={ssoStrategy !== null}
                                            accessibilityLabel={`Continue with ${label}`}
                                        >
                                            <AntDesign name={icon} size={22} color={colors.primary} />
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* Sign-Up Link */}
                        <View className="auth-link-row">
                            <Text className="auth-link-copy">Don&apos;t have an account?</Text>
                            <Link href="/(auth)/sign-up" asChild>
                                <Pressable>
                                    <Text className="auth-link">Create Account</Text>
                                </Pressable>
                            </Link>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignIn;
