import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PointsDisplayProps {
  points: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const PointsDisplay: React.FC<PointsDisplayProps> = ({
  points,
  label = 'Daily Points',
  size = 'medium',
  showIcon = true,
}) => {
  const sizes = {
    small: { points: 16, label: 11, icon: 16 },
    medium: { points: 22, label: 13, icon: 20 },
    large: { points: 28, label: 15, icon: 24 },
  };

  const currentSize = sizes[size];

  return (
    <View style={styles.container}>
      {showIcon && (
        <View style={styles.iconContainer}>
          <Ionicons name="leaf" size={currentSize.icon} color="#4CAF50" />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.points, { fontSize: currentSize.points }]}>
          +{points.toLocaleString()} Points
        </Text>
        <Text style={[styles.label, { fontSize: currentSize.label }]}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 8,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  points: {
    fontWeight: '700',
    color: '#4CAF50',
  },
  label: {
    color: '#888888',
    marginTop: 2,
  },
});

export default PointsDisplay;
