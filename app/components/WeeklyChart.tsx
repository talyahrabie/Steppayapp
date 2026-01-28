import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface DayData {
  day: string;
  steps: number;
}

interface WeeklyChartProps {
  data: DayData[];
  goal: number;
}

const WeeklyChart: React.FC<WeeklyChartProps> = ({ data, goal }) => {
  const maxSteps = Math.max(...data.map((d) => d.steps), goal);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Activity</Text>
      
      <View style={styles.chartContainer}>
        {/* Goal line */}
        <View
          style={[
            styles.goalLine,
            { bottom: `${(goal / maxSteps) * 100}%` },
          ]}
        >
          <Text style={styles.goalText}>{(goal / 1000).toFixed(0)}k goal</Text>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const height = (item.steps / maxSteps) * 100;
            const isGoalReached = item.steps >= goal;
            const isToday = index === data.length - 1;

            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  {isGoalReached ? (
                    <LinearGradient
                      colors={['#4CAF50', '#388E3C']}
                      style={[styles.bar, { height: `${height}%` }]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.bar,
                        styles.barIncomplete,
                        { height: `${height}%` },
                      ]}
                    />
                  )}
                </View>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {item.day}
                </Text>
                <Text style={styles.stepsLabel}>
                  {(item.steps / 1000).toFixed(1)}k
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Goal reached</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
          <Text style={styles.legendText}>In progress</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  chartContainer: {
    height: 180,
    position: 'relative',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderTopColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  goalText: {
    position: 'absolute',
    right: 0,
    top: -18,
    fontSize: 10,
    color: '#4A90E2',
    fontWeight: '600',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    width: 24,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  bar: {
    width: '100%',
    borderRadius: 12,
  },
  barIncomplete: {
    backgroundColor: '#E0E0E0',
  },
  dayLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#888888',
    fontWeight: '500',
  },
  dayLabelToday: {
    color: '#4A90E2',
    fontWeight: '700',
  },
  stepsLabel: {
    fontSize: 10,
    color: '#AAAAAA',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#888888',
  },
});

export default WeeklyChart;
