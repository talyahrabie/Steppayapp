import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  unlocked: boolean;
  progress?: number; // 0 to 1 for locked achievements
  colors?: string[];
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  title,
  description,
  icon,
  unlocked,
  progress = 0,
  colors = ['#FFD700', '#FFA500'],
}) => {
  return (
    <View style={[styles.container, !unlocked && styles.containerLocked]}>
      <View style={styles.badgeContainer}>
        {unlocked ? (
          <LinearGradient colors={colors} style={styles.badge}>
            <Ionicons name={icon} size={28} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={styles.badgeLocked}>
            <Ionicons name={icon} size={28} color="#CCCCCC" />
            {progress > 0 && (
              <View style={styles.progressOverlay}>
                <View style={[styles.progressFill, { height: `${progress * 100}%` }]} />
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, !unlocked && styles.titleLocked]}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      {unlocked && (
        <View style={styles.checkmark}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  containerLocked: {
    opacity: 0.7,
  },
  badgeContainer: {
    marginRight: 16,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeLocked: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    justifyContent: 'flex-end',
  },
  progressFill: {
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    width: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  titleLocked: {
    color: '#888888',
  },
  description: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
  },
  checkmark: {
    marginLeft: 8,
  },
});

export default AchievementBadge;
