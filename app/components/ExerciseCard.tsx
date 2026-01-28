import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ExerciseCardProps {
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  imageUrl?: string;
  category: string;
  onStart: () => void;
}

const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category.toLowerCase()) {
    case 'exercises':
      return 'fitness';
    case 'relaxation':
      return 'leaf';
    case 'nutrition':
      return 'nutrition';
    case 'remembrances':
      return 'book';
    default:
      return 'body';
  }
};

const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'exercises':
      return '#4A90E2';
    case 'relaxation':
      return '#26A69A';
    case 'nutrition':
      return '#FFA726';
    case 'remembrances':
      return '#9575CD';
    default:
      return '#78909C';
  }
};

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  title,
  description,
  duration,
  difficulty,
  imageUrl,
  category,
  onStart,
}) => {
  const categoryColor = getCategoryColor(category);
  const categoryIcon = getCategoryIcon(category);

  return (
    <View style={styles.card}>
      {/* Image */}
      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
            <Ionicons name={categoryIcon} size={20} color={categoryColor} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          </View>
          <TouchableOpacity style={styles.startButton} onPress={onStart}>
            <Text style={styles.startText}>START</Text>
            <Ionicons name="play-circle" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Meta info */}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{duration} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="speedometer-outline" size={14} color="#888" />
            <Text style={styles.metaText}>{difficulty}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  startText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4CAF50',
  },
  meta: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#888888',
    textTransform: 'capitalize',
  },
});

export default ExerciseCard;
