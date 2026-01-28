import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
// استيراد مكتبة supabase (تأكد من المسار الصحيح لملفك)
import { supabase } from '../lib/supabase'; 

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // تسجيل الدخول بواسطة جوجل (يحتاج إعدادات إضافية، سنتركه تنبيه حالياً)
  const handleGoogleLogin = () => {
    Alert.alert("Coming Soon", "Google login requires additional setup on Google Cloud Console.");
  };

  // تسجيل الدخول بواسطة أبل (يحتاج إعدادات إضافية)
  const handleAppleLogin = () => {
    Alert.alert("Coming Soon", "Apple login requires an Apple Developer Account.");
  };

  // --- هذا هو الجزء المهم الذي تم تعديله ---
  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // 1. حالة إنشاء حساب جديد
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        });

        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else {
          // نجاح التسجيل
          Alert.alert(
            'Success',
            'Account created! Please check your email to verify your account.'
          );
          setIsSignUp(false); // العودة لشاشة الدخول
        }

      } else {
        // 2. حالة تسجيل الدخول
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          Alert.alert('Login Error', error.message);
        } else {
          // نجاح الدخول - الانتقال للشاشة الرئيسية
          router.replace('/(tabs)/home');
        }
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (showEmailForm) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.emailFormContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowEmailForm(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#4A5568" />
            </TouchableOpacity>

            <Text style={styles.formTitle}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.formSubtitle}>
              {isSignUp
                ? 'Sign up to start tracking your steps'
                : 'Sign in to continue your journey'}
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleEmailAuth} // تم تغيير الدالة هنا
              disabled={loading}
            >
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>
                    {isSignUp ? 'Sign Up' : 'Sign In'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchModeText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <Text style={styles.switchModeLink}>
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={{ uri: 'https://d64gsuwffb70l.cloudfront.net/6976dfec0c0ce3dfa04b9565_1769398410824_62ea1151.png' }}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Logo */}
        <Text style={styles.logo}>
          <Text style={styles.logoSte}>Ste</Text>
          <Text style={styles.logoPP}>PP</Text>
          <Text style={styles.logoay}>ay</Text>
        </Text>
        <Text style={styles.tagline}>Quick & secure access to your activity</Text>

        {/* Login Buttons */}
        <View style={styles.buttonsContainer}>
          {/* Google */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.socialGradient}
            >
              <View style={styles.socialIconContainer}>
                <View style={styles.googleIcon}>
                  <Text style={styles.googleG}>G</Text>
                </View>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Apple */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleLogin}
            disabled={loading}
          >
            <View style={styles.appleButton}>
              <View style={styles.socialIconContainer}>
                <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.appleButtonText}>Continue with Apple</Text>
            </View>
          </TouchableOpacity>

          {/* Email/Phone */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={() => setShowEmailForm(true)}
            disabled={loading}
          >
            <LinearGradient
              colors={['#4CAF50', '#388E3C']}
              style={styles.socialGradient}
            >
              <View style={styles.socialIconContainer}>
                <Ionicons name="mail" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.socialButtonText}>Email/Phone</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <TouchableOpacity
          style={styles.signUpLink}
          onPress={() => {
            setIsSignUp(true);
            setShowEmailForm(true);
          }}
        >
          <Text style={styles.signUpText}>
            New to StePPay? <Text style={styles.signUpBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: 220,
    height: 180,
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  logoSte: {
    color: '#4A90E2',
  },
  logoPP: {
    color: '#9B59B6',
  },
  logoay: {
    color: '#4CAF50',
  },
  tagline: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonsContainer: {
    gap: 12,
  },
  socialButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  socialGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  socialIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signUpLink: {
    marginTop: 30,
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: '#666666',
  },
  signUpBold: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  emailFormContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  switchMode: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#666666',
  },
  switchModeLink: {
    fontWeight: '700',
    color: '#4A90E2',
  },
});