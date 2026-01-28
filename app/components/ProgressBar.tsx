import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  progress: number; // 0 to 1
  height?: number;
  showLabel?: boolean;
  label?: string;
  colors?: string[];
  backgroundColor?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 12,
  showLabel = true,
  label,
  colors = ['#4A90E2', '#357ABD'],
  backgroundColor = '#E0E0E0',
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: clampedProgress,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label || 'Progress'}</Text>
          <Text style={styles.percentage}>{Math.round(clampedProgress * 100)}%</Text>
        </View>
      )}
      <View style={[styles.track, { height, backgroundColor }]}>
        <Animated.View style={[styles.progressContainer, { width: widthInterpolation }]}>
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progress, { height }]}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A5568',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  track: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressContainer: {
    height: '100%',
  },
  progress: {
    borderRadius: 999,
  },
});

export default ProgressBar;
