import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureException } from '../../lib/sentry';

// ─────────────────────────────────────────────────────────────────────────────
// Last-resort error boundary for the whole app (Phase 1 Batch B).
//
// If any screen throws during render, the user gets this friendly
// bilingual fallback with a working "try again" button instead of a
// white crash screen. The error is reported to Sentry when a DSN is
// configured (lib/sentry.ts) and always logged to the console.
//
// The language is read straight from AsyncStorage (the same key
// AppContext persists) because this boundary must keep working even if
// AppContext itself is what crashed.
// ─────────────────────────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    title: 'Something went wrong',
    body: 'The app ran into an unexpected problem. Your steps and points are saved — please try again.',
    retry: 'Try again',
  },
  ar: {
    title: 'حدث خطأ ما',
    body: 'واجه التطبيق مشكلة غير متوقعة. خطواتك ونقاطك محفوظة — من فضلك حاول مرة أخرى.',
    retry: 'حاول مرة أخرى',
  },
} as const;

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  language: 'en' | 'ar';
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, language: 'en' };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidMount() {
    AsyncStorage.getItem('setting_lang')
      .then((lang) => {
        if (lang === 'ar' || lang === 'en') this.setState({ language: lang });
      })
      .catch(() => {});
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('AppErrorBoundary caught an error:', error, info.componentStack);
    captureException(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const s = STRINGS[this.state.language];
    const isAr = this.state.language === 'ar';
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={[styles.title, isAr && styles.rtl]}>{s.title}</Text>
        <Text style={[styles.body, isAr && styles.rtl]}>{s.body}</Text>
        <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
          <Text style={styles.buttonText}>{s.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8, textAlign: 'center' },
  body: { fontSize: 15, color: '#4A5568', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  rtl: { writingDirection: 'rtl' },
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default AppErrorBoundary;
