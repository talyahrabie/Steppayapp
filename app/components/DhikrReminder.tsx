import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface DhikrReminderProps {
  visible: boolean;
  onDismiss: () => void;
  onComplete: () => void;
}

const dhikrList = [
  { arabic: 'سُبْحَانَ اللَّهِ', transliteration: 'SubhanAllah', meaning: 'Glory be to Allah', count: 33 },
  { arabic: 'الْحَمْدُ لِلَّهِ', transliteration: 'Alhamdulillah', meaning: 'Praise be to Allah', count: 33 },
  { arabic: 'اللَّهُ أَكْبَرُ', transliteration: 'Allahu Akbar', meaning: 'Allah is the Greatest', count: 34 },
  { arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ', transliteration: 'La ilaha illallah', meaning: 'There is no god but Allah', count: 10 },
  { arabic: 'أَسْتَغْفِرُ اللَّهَ', transliteration: 'Astaghfirullah', meaning: 'I seek forgiveness from Allah', count: 10 },
];

const DhikrReminder: React.FC<DhikrReminderProps> = ({
  visible,
  onDismiss,
  onComplete,
}) => {
  const [currentDhikr, setCurrentDhikr] = useState(dhikrList[0]);
  const [count, setCount] = useState(0);
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (visible) {
      const randomIndex = Math.floor(Math.random() * dhikrList.length);
      setCurrentDhikr(dhikrList[randomIndex]);
      setCount(0);
    }
  }, [visible]);

  const handleTap = () => {
    // Animate tap
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();

    if (count < currentDhikr.count - 1) {
      setCount(count + 1);
    } else {
      onComplete();
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
          <Ionicons name="close" size={24} color="#888" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="book" size={24} color="#4A90E2" />
          <Text style={styles.headerText}>Dhikr Reminder</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={handleTap}>
          <Animated.View style={[styles.dhikrCard, { transform: [{ scale: scaleAnim }] }]}>
            <LinearGradient
              colors={['#4A90E2', '#357ABD']}
              style={styles.dhikrGradient}
            >
              <Text style={styles.arabicText}>{currentDhikr.arabic}</Text>
              <Text style={styles.transliteration}>{currentDhikr.transliteration}</Text>
              <Text style={styles.meaning}>{currentDhikr.meaning}</Text>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>

        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {count} / {currentDhikr.count}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(count / currentDhikr.count) * 100}%` },
              ]}
            />
          </View>
        </View>

        <Text style={styles.tapHint}>Tap to count</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dhikrCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  dhikrGradient: {
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  arabicText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  transliteration: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  meaning: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  counterContainer: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  tapHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#888888',
  },
});

export default DhikrReminder;
