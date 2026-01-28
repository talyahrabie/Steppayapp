import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RewardCardProps {
  brandName: string;
  title: string;
  description: string;
  pointsRequired: number;
  imageUrl?: string;
  backgroundColor?: string;
  userPoints: number;
  onRedeem: () => void;
}

const RewardCard: React.FC<RewardCardProps> = ({
  brandName,
  title,
  description,
  pointsRequired,
  imageUrl,
  backgroundColor = '#FFFFFF',
  userPoints,
  onRedeem,
}) => {
  const canRedeem = userPoints >= pointsRequired;

  return (
    <View style={[styles.card, { backgroundColor }]}>
      {/* Brand logo area */}
      <View style={styles.brandSection}>
        <Text style={styles.brandName}>{brandName}</Text>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.brandImage} resizeMode="contain" />
        )}
      </View>

      {/* Offer details */}
      <View style={styles.detailsSection}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.redeemButton, !canRedeem && styles.redeemButtonDisabled]}
            onPress={onRedeem}
            disabled={!canRedeem}
          >
            <Text style={styles.redeemText}>Redeem Now</Text>
          </TouchableOpacity>

          <View style={styles.pointsInfo}>
            <Text style={styles.requiresText}>Requires:</Text>
            <Text style={[styles.pointsText, !canRedeem && styles.pointsTextRed]}>
              {pointsRequired.toLocaleString()} Points
            </Text>
          </View>
        </View>
      </View>

      {/* Decorative pattern */}
      <View style={styles.patternOverlay}>
        <Ionicons name="fitness-outline" size={80} color="rgba(0,0,0,0.03)" style={styles.patternIcon} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  brandSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  brandImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  detailsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  redeemButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
  },
  redeemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pointsInfo: {
    alignItems: 'flex-end',
  },
  requiresText: {
    fontSize: 11,
    color: '#888888',
  },
  pointsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  pointsTextRed: {
    color: '#E53935',
  },
  patternOverlay: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.5,
  },
  patternIcon: {
    transform: [{ rotate: '-15deg' }],
  },
});

export default RewardCard;
