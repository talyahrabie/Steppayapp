import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

interface PedometerData {
  steps: number;
  distance: number;
  calories: number;
  points: number;
  isAvailable: boolean;
  isPedometerAvailable: boolean;
}

const STEPS_KEY = 'daily_steps_data';
const LAST_SYNC_KEY = 'last_sync_date';

export const usePedometer = (userId?: string) => {
  const [data, setData] = useState<PedometerData>({
    steps: 0,
    distance: 0,
    calories: 0,
    points: 0,
    isAvailable: false,
    isPedometerAvailable: false,
  });
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    checkAvailability();
    loadStoredSteps();
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  const checkAvailability = async () => {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      setData(prev => ({ ...prev, isPedometerAvailable: isAvailable, isAvailable }));
      
      if (isAvailable) {
        startTracking();
        getTodaySteps();
      }
    } catch (error) {
      console.log('Pedometer not available:', error);
      // Fall back to simulated steps for demo
      startSimulatedTracking();
    }
  };

  const loadStoredSteps = async () => {
    try {
      const stored = await AsyncStorage.getItem(STEPS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const today = new Date().toDateString();
        
        // Reset if it's a new day
        if (parsed.date !== today) {
          await syncToDatabase(parsed);
          await AsyncStorage.setItem(STEPS_KEY, JSON.stringify({ date: today, steps: 0 }));
        } else {
          updateStepData(parsed.steps);
        }
      }
    } catch (error) {
      console.log('Error loading stored steps:', error);
    }
  };

  const getTodaySteps = async () => {
    try {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(start, end);
      if (result) {
        updateStepData(result.steps);
        saveSteps(result.steps);
      }
    } catch (error) {
      console.log('Error getting today steps:', error);
    }
  };

  const startTracking = () => {
    subscriptionRef.current = Pedometer.watchStepCount(result => {
      setData(prev => {
        const newSteps = prev.steps + result.steps;
        saveSteps(newSteps);
        return calculateMetrics(newSteps);
      });
    });
  };

  const startSimulatedTracking = () => {
    // Simulated step counting for demo/testing
    const interval = setInterval(() => {
      setData(prev => {
        const newSteps = prev.steps + Math.floor(Math.random() * 3) + 1;
        saveSteps(newSteps);
        return calculateMetrics(newSteps);
      });
    }, 5000);

    // Store interval for cleanup
    subscriptionRef.current = { remove: () => clearInterval(interval) };
    
    // Start with some initial steps for demo
    const initialSteps = 10456;
    updateStepData(initialSteps);
    saveSteps(initialSteps);
  };

  const calculateMetrics = (steps: number): PedometerData => {
    const distance = (steps * 0.762) / 1000; // km
    const calories = Math.round(steps * 0.04);
    const points = Math.floor(steps / 50); // 1 point per 50 steps

    return {
      steps,
      distance: parseFloat(distance.toFixed(2)),
      calories,
      points,
      isAvailable: data.isAvailable,
      isPedometerAvailable: data.isPedometerAvailable,
    };
  };

  const updateStepData = (steps: number) => {
    setData(calculateMetrics(steps));
  };

  const saveSteps = async (steps: number) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem(STEPS_KEY, JSON.stringify({ date: today, steps }));
    } catch (error) {
      console.log('Error saving steps:', error);
    }
  };

  const syncToDatabase = async (dayData: { date: string; steps: number }) => {
    if (!userId) return;

    try {
      const metrics = calculateMetrics(dayData.steps);
      const dateStr = new Date(dayData.date).toISOString().split('T')[0];

      const { error } = await supabase
        .from('daily_steps')
        .upsert({
          user_id: userId,
          date: dateStr,
          steps: dayData.steps,
          distance_km: metrics.distance,
          calories: metrics.calories,
          points_earned: metrics.points,
          goal_reached: dayData.steps >= 8000,
        }, {
          onConflict: 'user_id,date'
        });

      if (error) {
        console.log('Error syncing to database:', error);
      } else {
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      }
    } catch (error) {
      console.log('Error syncing steps:', error);
    }
  };

  const manualSync = async () => {
    const stored = await AsyncStorage.getItem(STEPS_KEY);
    if (stored && userId) {
      await syncToDatabase(JSON.parse(stored));
    }
  };

  return {
    ...data,
    manualSync,
    refresh: getTodaySteps,
  };
};

export default usePedometer;
