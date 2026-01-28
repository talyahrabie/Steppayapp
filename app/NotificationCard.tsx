import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NotificationCardProps {
  title: string;
  message: string;
  time: string;
  type: 'achievement' | 'reward' | 'reminder' | 'info';
  isRead: boolean;
  onPress?: () => void;
  onDismiss?: () => void;
}

const getTypeConfig = (type: string) => {
  switch (type) {
    case 'achievement':
      return { icon: 'trophy' as const, color: '#FFD700', bgColor: '#FFF8E1' };
    case 'reward':
      return { icon: 'gift' as const, color: '#4CAF50', bgColor: '#E8F5E9' };
    case 'reminder':
      return { icon: 'notifications' as const, color: '#4A90E2', bgColor: '#E3F2FD' };
    default:
      return { icon: 'information-circle' as const, color: '#9575CD', bgColor: '#EDE7F6' };
  }
};

const NotificationCard: React.FC<NotificationCardProps> = ({
  title,
  message,
  time,
  type,
  isRead,
  onPress,
  onDismiss,
}) => {
  const config = getTypeConfig(type);

  return (
    <TouchableOpacity
      style={[styles.card, !isRead && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={24} color={config.color} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>

      {onDismiss && (
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Ionicons name="close" size={18} color="#888" />
        </TouchableOpacity>
      )}

      {!isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: '#F8FAFF',
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#888888',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
});

export default NotificationCard;
