import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { useSignUp, useAuth } from '@clerk/expo';
import { useState } from 'react';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'nativewind';
import { posthog } from '@/lib/posthog';
import { useThemeColors } from '@/constants/theme';
import clsx from 'clsx';

const SafeAreaView = styled(RNSafeAreaView);

const SignUp = () => {
    const colors = useThemeColors();
    const { signUp, errors, fetchStatus } = useSignUp();
    const { isSignedIn } = useAuth();

    const [emailAddress, setEmailAddress] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');

    // Validation states
    const [emailTouched, setEmailTouched] = useState(false);

    // Set once the email code has actually been sent, so the screen switch never
    // depends on instance-specific resource state.
    const [pendingVerification, setPendingVerification] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Only validate what's knowable client-side. Password rules (length,
    // breach checks) are instance settings, so let Clerk be the authority
    // and report them through errors.fields.password.
    const emailValid = emailAddress.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress);
    const formValid =
        emailAddress.length > 0 && username.length > 0 && password.length > 0 && emailValid;

    const handleSubmit = async () => {
        if (!formValid) return;
        setFormError(null);

        // Clerk surfaces failures through errors.fields / errors.global, which the
        // form renders - don't echo error.message here or it shows up twice.
        const { error } = await signUp.password({
            emailAddress,
            password,
        });

        if (error) return;

        const { error: updateError } = await signUp.update({ username });

        if (updateError) return;

        // The sign-up can't complete if the instance requires fields this form
        // doesn't collect. Say so instead of stalling with no feedback.
        if (signUp.missingFields.length > 0) {
            setFormError(
                `This Clerk instance also requires: ${signUp.missingFields.join(', ')}.`
            );
            return;
        }

        const { error: sendError } = await signUp.verifications.sendEmailCode();

        if (sendError) return;

        setPendingVerification(true);
    };

    const handleVerify = async () => {
        setFormError(null);

        const { error } = await signUp.verifications.verifyEmailCode({
            code,
        });

        if (error) return;

        // Activates the session; the (auth) layout redirects once isSignedIn flips.
        await signUp.finalize();
        posthog?.capture('sign_up_completed', { method: 'email_code' });
    };

    const handleResend = async () => {
        setFormError(null);
        await signUp.verifications.sendEmailCode();
    };

    // Without this the verification screen is a dead end - a mistyped email
    // address leaves no way back to the form.
    const handleStartOver = async () => {
        setFormError(null);
        setCode('');
        setPendingVerification(false);
        await signUp.reset();
    };

    // Don't show anything if already signed in or sign-up is complete
    if (signUp.status === 'complete' || isSignedIn) {
        return null;
    }

    // Show verification screen once the code has actually been sent
    if (pendingVerification) {
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
                                <Text className="auth-title">Verify your email</Text>
                                <Text className="auth-subtitle">
                                    We sent a verification code to {emailAddress}
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
                                            placeholderTextColor={colors.placeholder}
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
                                            {fetchStatus === 'fetching' ? 'Verifying...' : 'Verify Email'}
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
                                        onPress={handleStartOver}
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

    // Main sign-up form
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
                            <Text className="auth-title">Create your account</Text>
                            <Text className="auth-subtitle">
                                Start tracking your subscriptions and never miss a payment
                            </Text>
                        </View>

                        {/* Sign-Up Form */}
                        <View className="auth-card">
                            <View className="auth-form">
                                <View className="auth-field">
                                    <Text className="auth-label">Email Address</Text>
                                    <TextInput
                                        className={clsx('auth-input', emailTouched && !emailValid && 'auth-input-error')}
                                        autoCapitalize="none"
                                        value={emailAddress}
                                        placeholder="name@example.com"
                                        placeholderTextColor={colors.placeholder}
                                        onChangeText={setEmailAddress}
                                        onBlur={() => setEmailTouched(true)}
                                        keyboardType="email-address"
                                        autoComplete="email"
                                    />
                                    {emailTouched && !emailValid && (
                                        <Text className="auth-error">Please enter a valid email address</Text>
                                    )}
                                    {errors.fields.emailAddress && (
                                        <Text className="auth-error">{errors.fields.emailAddress.message}</Text>
                                    )}
                                </View>

                                <View className="auth-field">
                                    <Text className="auth-label">Username</Text>
                                    <TextInput
                                        className={clsx('auth-input', errors.fields.username && 'auth-input-error')}
                                        autoCapitalize="none"
                                        value={username}
                                        placeholder="yourname"
                                        placeholderTextColor={colors.placeholder}
                                        onChangeText={setUsername}
                                        autoComplete="username-new"
                                    />
                                    {errors.fields.username && (
                                        <Text className="auth-error">{errors.fields.username.message}</Text>
                                    )}
                                </View>

                                <View className="auth-field">
                                    <Text className="auth-label">Password</Text>
                                    <TextInput
                                        className={clsx('auth-input', errors.fields.password && 'auth-input-error')}
                                        value={password}
                                        placeholder="Create a strong password"
                                        placeholderTextColor={colors.placeholder}
                                        secureTextEntry
                                        onChangeText={setPassword}
                                        autoComplete="password-new"
                                    />
                                    {errors.fields.password && (
                                        <Text className="auth-error">{errors.fields.password.message}</Text>
                                    )}
                                </View>

                                {formError && <Text className="auth-error">{formError}</Text>}
                                {errors.fields.captcha && (
                                    <Text className="auth-error">{errors.fields.captcha.message}</Text>
                                )}
                                {errors.global?.map((err, i) => (
                                    <Text key={i} className="auth-error">{err.message}</Text>
                                ))}

                                <Pressable
                                    className={clsx('auth-button', (!formValid || fetchStatus === 'fetching') && 'auth-button-disabled')}
                                    onPress={handleSubmit}
                                    disabled={!formValid || fetchStatus === 'fetching'}
                                >
                                    <Text className="auth-button-text">
                                        {fetchStatus === 'fetching' ? 'Creating Account...' : 'Create Account'}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Sign-In Link */}
                        <View className="auth-link-row">
                            <Text className="auth-link-copy">Already have an account?</Text>
                            <Link href="/(auth)/sign-in" asChild>
                                {/* `.auth-link` is just the text's own line height (~20pt) with
                                    no padding - under the 44pt minimum. hitSlop instead of
                                    padding, which would misalign it from the copy beside it. */}
                                <Pressable hitSlop={{ top: 12, bottom: 12 }}>
                                    <Text className="auth-link">Sign In</Text>
                                </Pressable>
                            </Link>
                        </View>

                        {/* Required for Clerk's bot protection */}
                        <View nativeID="clerk-captcha" />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

export default SignUp;
