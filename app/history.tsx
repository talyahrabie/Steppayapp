import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import WeeklyChart from './components/WeeklyChart';
import { supabase } from '../lib/supabase';
import { getMergedHistoryRange, DayRecord } from '../lib/stepHistory';
import { DAILY_STEP_GOAL } from '../lib/config';

type Period = 'week' | 'month' | 'year';

const PERIOD_DAYS: Record<Period, number> = { week: 7, month: 30, year: 365 };

interface ListRow {
  key: string;
  title: string;
  subtitle: string;
  steps: number;
  distanceKm: number;
  calories: number;
  points: number;
  goalReached: boolean;
}

/** Parse a local `YYYY-MM-DD` key without timezone surprises. */
const parseKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const dayTitle = (record: DayRecord, indexFromEnd: number): string => {
  if (indexFromEnd === 0) return 'Today';
  if (indexFromEnd === 1) return 'Yesterday';
  return parseKey(record.date).toLocaleDateString('en-US', { weekday: 'long' });
};

export default function HistoryScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (period: Period) => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id ?? null;
      const days = PERIOD_DAYS[period];
      const merged = await getMergedHistoryRange(days, userId);
      setRecords(merged);
    } catch (e) {
      console.log('Error loading history:', e);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(selectedPeriod);
    }, [load, selectedPeriod])
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const totalSteps = records.reduce((sum, r) => sum + r.steps, 0);
  const totalDistance = records.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalCalories = records.reduce((sum, r) => sum + r.calories, 0);
  const activeDays = records.filter((r) => r.steps > 0).length;
  const avgSteps = activeDays > 0 ? Math.round(totalSteps / activeDays) : 0;

  // Chart always shows the most recent 7 days.
  const chartData = records.slice(-7).map((r) => ({
    day: parseKey(r.date).toLocaleDateString('en-US', { weekday: 'short' }),
    steps: r.steps,
  }));

  // List rows: daily for week/month, monthly aggregates for year.
  const rows: ListRow[] = (() => {
    if (selectedPeriod === 'year') {
      const byMonth = new Map<string, DayRecord[]>();
      for (const r of records) {
        const monthKey = r.date.slice(0, 7);
        const arr = byMonth.get(monthKey) ?? [];
        arr.push(r);
        byMonth.set(monthKey, arr);
      }
      return [...byMonth.entries()]
        .reverse()
        .map(([monthKey, days]) => {
          const steps = days.reduce((s, d) => s + d.steps, 0);
          const date = parseKey(`${monthKey}-01`);
          return {
            key: monthKey,
            title: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            subtitle: `${days.filter((d) => d.steps > 0).length} active days`,
            steps,
            distanceKm: days.reduce((s, d) => s + d.distanceKm, 0),
            calories: days.reduce((s, d) => s + d.calories, 0),
            points: days.reduce((s, d) => s + d.points, 0),
            goalReached: days.some((d) => d.goalReached),
          };
        });
    }
    return [...records].reverse().map((r, i) => ({
      key: r.date,
      title: dayTitle(r, i),
      subtitle: parseKey(r.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      steps: r.steps,
      distanceKm: r.distanceKm,
      calories: r.calories,
      points: r.points,
      goalReached: r.goalReached,
    }));
  })();

  const hasAnyData = totalSteps > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A5568" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity History</Text>
        <View style={styles.calendarButton}>
          <Ionicons name="calendar-outline" size={24} color="#4A5568" />
        </View>
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

        {loading ? (
          <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
        ) : (
          <>
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
            <WeeklyChart data={chartData} goal={DAILY_STEP_GOAL} />

            {/* Breakdown */}
            <Text style={styles.sectionTitle}>
              {selectedPeriod === 'year' ? 'Monthly Breakdown' : 'Daily Breakdown'}
            </Text>

            {!hasAnyData ? (
              <View style={styles.emptyState}>
                <Ionicons name="footsteps-outline" size={40} color="#B0BEC5" />
                <Text style={styles.emptyTitle}>No activity recorded yet</Text>
                <Text style={styles.emptyText}>
                  Start walking with step tracking on and your real history will appear here.
                </Text>
              </View>
            ) : (
              rows.map((row) => (
                <View key={row.key} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View>
                      <Text style={styles.dayName}>{row.title}</Text>
                      <Text style={styles.dayDate}>{row.subtitle}</Text>
                    </View>
                    {row.goalReached ? (
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
                      <Text style={styles.dayStatValue}>{row.steps.toLocaleString()}</Text>
                    </View>
                    <View style={styles.dayStat}>
                      <Ionicons name="map" size={16} color="#888" />
                      <Text style={styles.dayStatValue}>{row.distanceKm.toFixed(2)} km</Text>
                    </View>
                    <View style={styles.dayStat}>
                      <Ionicons name="flame" size={16} color="#888" />
                      <Text style={styles.dayStatValue}>{row.calories}</Text>
                    </View>
                    <View style={styles.dayStat}>
                      <Ionicons name="star" size={16} color="#888" />
                      <Text style={styles.dayStatValue}>+{row.points}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        )}

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
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
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
