import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import WeeklyChart from './components/WeeklyChart';

interface DayHistory {
  date: string;
  dayName: string;
  steps: number;
  distance: number;
  calories: number;
  points: number;
  goalReached: boolean;
}

const weeklyData = [
  { day: 'Mon', steps: 8500 },
  { day: 'Tue', steps: 10200 },
  { day: 'Wed', steps: 7800 },
  { day: 'Thu', steps: 9100 },
  { day: 'Fri', steps: 11500 },
  { day: 'Sat', steps: 6200 },
  { day: 'Sun', steps: 10456 },
];

const historyData: DayHistory[] = [
  {
    date: 'Jan 26, 2026',
    dayName: 'Today',
    steps: 10456,
    distance: 7.97,
    calories: 418,
    points: 215,
    goalReached: true,
  },
  {
    date: 'Jan 25, 2026',
    dayName: 'Yesterday',
    steps: 6200,
    distance: 4.72,
    calories: 248,
    points: 124,
    goalReached: false,
  },
  {
    date: 'Jan 24, 2026',
    dayName: 'Friday',
    steps: 11500,
    distance: 8.76,
    calories: 460,
    points: 230,
    goalReached: true,
  },
  {
    date: 'Jan 23, 2026',
    dayName: 'Thursday',
    steps: 9100,
    distance: 6.93,
    calories: 364,
    points: 182,
    goalReached: true,
  },
  {
    date: 'Jan 22, 2026',
    dayName: 'Wednesday',
    steps: 7800,
    distance: 5.94,
    calories: 312,
    points: 156,
    goalReached: false,
  },
  {
    date: 'Jan 21, 2026',
    dayName: 'Tuesday',
    steps: 10200,
    distance: 7.77,
    calories: 408,
    points: 204,
    goalReached: true,
  },
  {
    date: 'Jan 20, 2026',
    dayName: 'Monday',
    steps: 8500,
    distance: 6.48,
    calories: 340,
    points: 170,
    goalReached: true,
  },
];

export default function HistoryScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  const totalSteps = historyData.reduce((sum, day) => sum + day.steps, 0);
  const totalDistance = historyData.reduce((sum, day) => sum + day.distance, 0);
  const totalCalories = historyData.reduce((sum, day) => sum + day.calories, 0);
  const avgSteps = Math.round(totalSteps / historyData.length);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A5568" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity History</Text>
        <TouchableOpacity style={styles.calendarButton}>
          <Ionicons name="calendar-outline" size={24} color="#4A5568" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive,
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="footsteps" size={20} color="#4A90E2" />
              <Text style={styles.summaryValue}>{totalSteps.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total Steps</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="map" size={20} color="#26A69A" />
              <Text style={styles.summaryValue}>{totalDistance.toFixed(1)} km</Text>
              <Text style={styles.summaryLabel}>Distance</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="flame" size={20} color="#E53935" />
              <Text style={styles.summaryValue}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Calories</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up" size={20} color="#FFA726" />
              <Text style={styles.summaryValue}>{avgSteps.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Daily Avg</Text>
            </View>
          </View>
        </View>

        {/* Weekly Chart */}
        <WeeklyChart data={weeklyData} goal={8000} />

        {/* Daily History */}
        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
        {historyData.map((day, index) => (
          <View key={index} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View>
                <Text style={styles.dayName}>{day.dayName}</Text>
                <Text style={styles.dayDate}>{day.date}</Text>
              </View>
              {day.goalReached ? (
                <View style={styles.goalBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.goalBadgeText}>Goal</Text>
                </View>
              ) : (
                <View style={[styles.goalBadge, styles.goalBadgeMissed]}>
                  <Ionicons name="close-circle" size={16} color="#E53935" />
                  <Text style={[styles.goalBadgeText, styles.goalBadgeTextMissed]}>
                    Missed
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.dayStats}>
              <View style={styles.dayStat}>
                <Ionicons name="footsteps" size={16} color="#888" />
                <Text style={styles.dayStatValue}>{day.steps.toLocaleString()}</Text>
              </View>
              <View style={styles.dayStat}>
                <Ionicons name="map" size={16} color="#888" />
                <Text style={styles.dayStatValue}>{day.distance} km</Text>
              </View>
              <View style={styles.dayStat}>
                <Ionicons name="flame" size={16} color="#888" />
                <Text style={styles.dayStatValue}>{day.calories}</Text>
              </View>
              <View style={styles.dayStat}>
                <Ionicons name="star" size={16} color="#888" />
                <Text style={styles.dayStatValue}>+{day.points}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  calendarButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888888',
  },
  periodButtonTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 12,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dayDate: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  goalBadgeMissed: {
    backgroundColor: '#FFEBEE',
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  goalBadgeTextMissed: {
    color: '#E53935',
  },
  dayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayStatValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4A5568',
  },
  bottomSpacing: {
    height: 30,
  },
});
