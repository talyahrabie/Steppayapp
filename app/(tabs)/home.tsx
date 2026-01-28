import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  AppState
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pedometer } from 'expo-sensors';

import StepCounter from '../components/StepCounter';
import PointsDisplay from '../components/PointsDisplay';
import FeatureCard from '../components/FeatureCard';

export default function HomeScreen() {
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const [points, setPoints] = useState(0);
  const [calories, setCalories] = useState(0);
  const [distance, setDistance] = useState(0);
  const [pedometerStatus, setPedometerStatus] = useState('Syncing...');
  
  const subscriptionRef = useRef(null);
  const dailyGoal = 10000;

  const fetchRealTimeSteps = async () => {
    const isAvailable = await Pedometer.isAvailableAsync();
    
    if (isAvailable) {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0); 

      try {
        const result = await Pedometer.getStepCountAsync(start, end);
        if (result) {
          setCurrentStepCount(result.steps);
          setPedometerStatus('Active');
        }
      } catch (error) {
        setPedometerStatus('Sensor Error');
        console.log("Error fetching steps:", error);
      }
    } else {
      setPedometerStatus('Not Available');
    }
  };

  useEffect(() => {
    fetchRealTimeSteps();

    const subscribe = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (isAvailable) {
        subscriptionRef.current = Pedometer.watchStepCount(() => {
          fetchRealTimeSteps();
        });
      }
    };
    subscribe();

    const intervalId = setInterval(() => {
      fetchRealTimeSteps();
    }, 3000); 

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchRealTimeSteps(); 
      }
    });

    return () => {
      subscriptionRef.current && subscriptionRef.current.remove();
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setPoints(Math.floor(currentStepCount / 100));
    setDistance(((currentStepCount * 0.76) / 1000).toFixed(2));
    setCalories(Math.floor(currentStepCount * 0.04));
  }, [currentStepCount]);

  const handleNotifications = () => {
    Alert.alert("Notifications", "No new notifications");
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
          <StepCounter steps={currentStepCount} goal={dailyGoal} size={260} />
          
          <View style={styles.liveIndicator}>
             <View style={[styles.dot, {backgroundColor: pedometerStatus === 'Active' ? '#4CAF50' : '#FF5252'}]} />
             <Text style={styles.liveText}>
               {pedometerStatus === 'Active' ? 'Live Tracking' : pedometerStatus}
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
            onPress={() => {}}
          />

           <FeatureCard
            title="Rewards Store"
            description="Redeem your points now."
            icon="gift"
            colors={['#4CAF50', '#388E3C']}
            rightIcon="chevron-forward"
            onPress={() => router.push('/(tabs)/rewards')}
          />
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
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