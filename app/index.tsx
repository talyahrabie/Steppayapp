import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Fitness icons for background pattern
const fitnessIcons = [
  { icon: 'walk', x: 0.1, y: 0.08, size: 40, color: '#4A90E2' },
  { icon: 'woman', x: 0.35, y: 0.05, size: 36, color: '#9B59B6' },
  { icon: 'fitness', x: 0.7, y: 0.06, size: 38, color: '#26A69A' },
  { icon: 'man', x: 0.9, y: 0.1, size: 40, color: '#4CAF50' },
  { icon: 'nutrition', x: 0.05, y: 0.2, size: 32, color: '#FFA726' },
  { icon: 'water', x: 0.25, y: 0.18, size: 34, color: '#42A5F5' },
  { icon: 'barbell', x: 0.55, y: 0.15, size: 36, color: '#78909C' },
  { icon: 'bicycle', x: 0.85, y: 0.22, size: 38, color: '#9575CD' },
  { icon: 'walk', x: 0.15, y: 0.75, size: 38, color: '#9B59B6' },
  { icon: 'woman', x: 0.4, y: 0.8, size: 36, color: '#4A90E2' },
  { icon: 'fitness', x: 0.65, y: 0.78, size: 40, color: '#4CAF50' },
  { icon: 'man', x: 0.88, y: 0.82, size: 36, color: '#26A69A' },
  { icon: 'nutrition', x: 0.08, y: 0.88, size: 30, color: '#E53935' },
  { icon: 'water', x: 0.3, y: 0.92, size: 32, color: '#4A90E2' },
  { icon: 'barbell', x: 0.55, y: 0.9, size: 34, color: '#78909C' },
  { icon: 'bicycle', x: 0.78, y: 0.95, size: 36, color: '#FFA726' },
];

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const iconAnims = useRef(fitnessIcons.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Animate logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate icons with stagger
    Animated.stagger(
      100,
      iconAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background pattern */}
      <View style={styles.patternContainer}>
        {fitnessIcons.map((item, index) => (
          <Animated.View
            key={index}
            style={[
              styles.patternIcon,
              {
                left: item.x * width,
                top: item.y * height,
                opacity: iconAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.15],
                }),
              },
            ]}
          >
            <Ionicons
              name={item.icon as keyof typeof Ionicons.glyphMap}
              size={item.size}
              color={item.color}
            />
          </Animated.View>
        ))}
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>
            <Text style={styles.logoSte}>Ste</Text>
            <Text style={styles.logoPP}>PP</Text>
            <Text style={styles.logoay}>ay</Text>
          </Text>
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>Walk... Earn... and enjoy your health</Text>

        {/* Get Started Button */}
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={handleGetStarted}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our{' '}
          <Text style={styles.footerLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternIcon: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    fontSize: 56,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
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
    fontSize: 18,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 60,
    fontWeight: '500',
  },
  getStartedButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#4A90E2',
    fontWeight: '500',
  },
});
