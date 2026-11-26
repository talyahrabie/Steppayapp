import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import StepCounter from '../components/StepCounter';
import PointsDisplay from '../components/PointsDisplay';
import FeatureCard from '../components/FeatureCard';
import DhikrReminder from '../components/DhikrReminder';
import { usePedometer } from '../hooks/usePedometer';
import { useApp } from '../context/AppContext';
import { DAILY_STEP_GOAL } from '../../lib/config';

export default function HomeScreen() {
  // The shared pedometer engine: it owns the sensor subscription, feeds
  // AppContext (points/XP), persists today's total and syncs to Supabase.
  // Home previously ran its own duplicate pedometer + 3-second polling and
  // never wrote anything to the shared state — that is all gone now.
  const { steps, points, calories, distance, isPedometerAvailable } = usePedometer();
  const { stepTracking } = useApp();
  const [showDhikr, setShowDhikr] = useState(false);

  const dailyGoal = DAILY_STEP_GOAL;

  const trackingStatus = !stepTracking
    ? 'Tracking Paused'
    : isPedometerAvailable
      ? 'Live Tracking'
      : 'Sensor Unavailable';

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handleProfile = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Header: اللوجو عاد من جديد */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleProfile}>
            <Ionicons name="person-circle-outline" size={32} color="#4A5568" />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
             <Ionicons name="footsteps" size={20} color="#4A90E2" style={{marginRight: 6}} />
             <Text style={styles.logoText}>
               <Text style={{color: '#4A90E2'}}>Ste</Text>
               <Text style={{color: '#9B59B6'}}>PP</Text>
               <Text style={{color: '#4CAF50'}}>ay</Text>
             </Text>
          </View>

          <TouchableOpacity onPress={handleNotifications}>
            <Ionicons name="notifications-outline" size={26} color="#4A5568" />
          </TouchableOpacity>
        </View>

        {/* القسم الرئيسي: العداد */}
        <View style={styles.mainFocusContainer}>
          <StepCounter steps={steps} goal={dailyGoal} size={260} />

          <View style={styles.liveIndicator}>
             <View style={[styles.dot, {backgroundColor: trackingStatus === 'Live Tracking' ? '#4CAF50' : trackingStatus === 'Tracking Paused' ? '#FFA726' : '#FF5252'}]} />
             <Text style={styles.liveText}>
               {trackingStatus}
             </Text>
          </View>
        </View>

        {/* قسم النقاط */}
        <View style={styles.pointsSection}>
           <PointsDisplay points={points} label="Points Earned" size="large" />
        </View>

        {/* الكروت */}
        <View style={styles.cardsContainer}>
          <FeatureCard
            title="Health Metrics"
            description={`${calories} kcal | ${distance} km`}
            icon="heart"
            colors={['#FF5252', '#D32F2F']}
            showChart={false}
            onPress={() => router.push('/history')}
          />

           <FeatureCard
            title="Rewards Store"
            description="Redeem your points now."
            icon="gift"
            colors={['#4CAF50', '#388E3C']}
            rightIcon="chevron-forward"
            onPress={() => router.push('/(tabs)/rewards')}
          />

          <FeatureCard
            title="Media Library"
            description="Listen while you walk."
            icon="headset"
            colors={['#4A90E2', '#357ABD']}
            rightIcon="chevron-forward"
            onPress={() => router.push('/media')}
          />

          <FeatureCard
            title="Daily Dhikr"
            description="A moment of remembrance."
            icon="book"
            colors={['#26A69A', '#00897B']}
            rightIcon="chevron-forward"
            onPress={() => setShowDhikr(true)}
          />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <DhikrReminder
        visible={showDhikr}
        onDismiss={() => setShowDhikr(false)}
        onComplete={() => setShowDhikr(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1, padding: 20 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },

  // --- ستايل اللوجو الجديد ---
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    // ظل خفيف للجمالية
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  // -------------------------

  mainFocusContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  liveText: { fontSize: 12, color: '#4CAF50', fontWeight: '600' },

  pointsSection: {
    marginVertical: 10,
    alignItems: 'center'
  },

  cardsContainer: {
    marginTop: 10,
    gap: 15
  },
  bottomSpacing: { height: 40 },
});
