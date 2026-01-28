import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
  showProfile?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  onProfilePress?: () => void;
  onNotificationPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showLogo = true,
  showProfile = true,
  showNotifications = true,
  notificationCount = 0,
  onProfilePress,
  onNotificationPress,
}) => {
  return (
    <View style={styles.header}>
      {showProfile ? (
        <TouchableOpacity onPress={onProfilePress} style={styles.iconButton}>
          <Ionicons name="person-circle-outline" size={32} color="#4A5568" />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}

      {showLogo ? (
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="footsteps" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>
            <Text style={styles.logoSte}>Ste</Text>
            <Text style={styles.logoPP}>PP</Text>
            <Text style={styles.logoay}>ay</Text>
          </Text>
        </View>
      ) : title ? (
        <Text style={styles.title}>{title}</Text>
      ) : (
        <View style={styles.placeholder} />
      )}

      {showNotifications ? (
        <TouchableOpacity onPress={onNotificationPress} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={26} color="#4A5568" />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  placeholder: {
    width: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#E53935',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default Header;
