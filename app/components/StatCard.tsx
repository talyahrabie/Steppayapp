import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: 'small' | 'medium' | 'large';
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  size = 'medium',
}) => {
  const sizes = {
    small: { card: 80, icon: 20, value: 16, label: 10 },
    medium: { card: 100, icon: 24, value: 18, label: 12 },
    large: { card: 120, icon: 28, value: 22, label: 14 },
  };

  const currentSize = sizes[size];

  return (
    <View style={[styles.card, { minWidth: currentSize.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={currentSize.icon} color={color} />
      </View>
      <Text style={[styles.value, { fontSize: currentSize.value }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={[styles.label, { fontSize: currentSize.label }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  label: {
    color: '#888888',
    textAlign: 'center',
  },
});

export default StatCard;
