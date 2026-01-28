import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

interface StepCounterProps {
  steps: number;
  goal: number;
  size?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const StepCounter: React.FC<StepCounterProps> = ({ steps, goal, size = 220 }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const progress = Math.min(steps / goal, 1);
  const radius = (size - 30) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: progress,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background glow */}
      <View style={[styles.glowOuter, { width: size + 40, height: size + 40 }]} />
      
      {/* SVG Progress Ring */}
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4FC3F7" />
            <Stop offset="50%" stopColor="#4A90E2" />
            <Stop offset="100%" stopColor="#7C4DFF" />
          </SvgGradient>
        </Defs>
        
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={12}
          fill="none"
        />
        
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={12}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Inner content */}
      <LinearGradient
        colors={['#4A90E2', '#3B7DD8', '#2D6BC9']}
        style={[styles.innerCircle, { width: size - 50, height: size - 50, borderRadius: (size - 50) / 2 }]}
      >
        <Ionicons name="walk" size={28} color="rgba(255,255,255,0.9)" style={styles.icon} />
        <Text style={styles.stepsText}>{formatNumber(steps)}</Text>
        <Text style={styles.labelText}>Steps Today</Text>
        
        {/* Running person indicator */}
        <View style={styles.runnerContainer}>
          <Ionicons name="fitness" size={18} color="rgba(255,255,255,0.7)" />
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowOuter: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(74, 144, 226, 0.15)',
  },
  svg: {
    position: 'absolute',
  },
  innerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  icon: {
    marginBottom: 4,
  },
  stepsText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  labelText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  runnerContainer: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -9,
  },
});

export default StepCounter;
