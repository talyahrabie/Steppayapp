import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: string[];
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightText?: string;
  onPress?: () => void;
  showChart?: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon,
  colors,
  rightIcon,
  rightText,
  onPress,
  showChart,
}) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Left icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name={icon} size={28} color={colors[0]} />
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          {showChart && (
            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsText}>View Details</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right section */}
        <View style={styles.rightSection}>
          {showChart && (
            <View style={styles.chartBars}>
              {[0.3, 0.5, 0.7, 0.4, 0.8, 0.6, 0.9].map((height, index) => (
                <View
                  key={index}
                  style={[
                    styles.bar,
                    { height: height * 40 },
                  ]}
                />
              ))}
            </View>
          )}
          {rightIcon && (
            <View style={styles.rightIcons}>
              <Ionicons name={rightIcon} size={24} color="rgba(255,255,255,0.9)" />
              {rightText && <Text style={styles.rightText}>{rightText}</Text>}
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  detailsButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  detailsText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 40,
    gap: 3,
  },
  bar: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 3,
  },
  rightIcons: {
    alignItems: 'center',
  },
  rightText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default FeatureCard;
