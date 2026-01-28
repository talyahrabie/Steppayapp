import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: string;
  imageUrl: string;
  category: string;
}

interface Playlist {
  id: string;
  title: string;
  trackCount: number;
  imageUrl: string;
  colors: string[];
}

const playlists: Playlist[] = [
  {
    id: '1',
    title: 'Morning Run',
    trackCount: 15,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398194158_4bfc8741.jpeg',
    colors: ['#4A90E2', '#357ABD'],
  },
  {
    id: '2',
    title: 'Workout Mix',
    trackCount: 20,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398198284_17563f2d.jpeg',
    colors: ['#E53935', '#C62828'],
  },
  {
    id: '3',
    title: 'Relaxing Walk',
    trackCount: 12,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398201342_97f4fbdd.jpeg',
    colors: ['#26A69A', '#00897B'],
  },
  {
    id: '4',
    title: 'Quran Recitation',
    trackCount: 30,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398204589_eaa4b862.jpeg',
    colors: ['#9575CD', '#7E57C2'],
  },
];

const tracks: Track[] = [
  {
    id: '1',
    title: 'Energy Boost',
    artist: 'Workout Beats',
    duration: '3:45',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398194158_4bfc8741.jpeg',
    category: 'workout',
  },
  {
    id: '2',
    title: 'Morning Motivation',
    artist: 'Running Tracks',
    duration: '4:12',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398198284_17563f2d.jpeg',
    category: 'running',
  },
  {
    id: '3',
    title: 'Peaceful Walk',
    artist: 'Nature Sounds',
    duration: '5:30',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398201342_97f4fbdd.jpeg',
    category: 'relaxing',
  },
  {
    id: '4',
    title: 'Surah Al-Fatiha',
    artist: 'Sheikh Mishary',
    duration: '1:05',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398204589_eaa4b862.jpeg',
    category: 'quran',
  },
  {
    id: '5',
    title: 'High Intensity',
    artist: 'Gym Mix',
    duration: '3:58',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398207838_aa4c12b6.jpeg',
    category: 'workout',
  },
];

const categories = [
  { id: 'all', label: 'All', icon: 'musical-notes' as const },
  { id: 'workout', label: 'Workout', icon: 'barbell' as const },
  { id: 'running', label: 'Running', icon: 'walk' as const },
  { id: 'relaxing', label: 'Relaxing', icon: 'leaf' as const },
  { id: 'quran', label: 'Quran', icon: 'book' as const },
];

export default function MediaScreen() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const filteredTracks =
    activeCategory === 'all'
      ? tracks
      : tracks.filter((t) => t.category === activeCategory);

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity style={styles.playlistCard}>
      <LinearGradient colors={item.colors} style={styles.playlistGradient}>
        <Image source={{ uri: item.imageUrl }} style={styles.playlistImage} />
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle}>{item.title}</Text>
          <Text style={styles.playlistTracks}>{item.trackCount} tracks</Text>
        </View>
        <TouchableOpacity style={styles.playlistPlayButton}>
          <Ionicons name="play" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4A5568" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Media Library</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={24} color="#4A5568" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Playlists */}
        <Text style={styles.sectionTitle}>Your Playlists</Text>
        <FlatList
          horizontal
          data={playlists}
          renderItem={renderPlaylist}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playlistsContainer}
        />

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                activeCategory === cat.id && styles.categoryTabActive,
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon}
                size={18}
                color={activeCategory === cat.id ? '#FFFFFF' : '#888'}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  activeCategory === cat.id && styles.categoryLabelActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tracks */}
        <Text style={styles.sectionTitle}>Tracks</Text>
        {filteredTracks.map((track) => (
          <TouchableOpacity
            key={track.id}
            style={[
              styles.trackCard,
              currentTrack?.id === track.id && styles.trackCardActive,
            ]}
            onPress={() => handlePlayTrack(track)}
          >
            <Image source={{ uri: track.imageUrl }} style={styles.trackImage} />
            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle}>{track.title}</Text>
              <Text style={styles.trackArtist}>{track.artist}</Text>
            </View>
            <Text style={styles.trackDuration}>{track.duration}</Text>
            <TouchableOpacity
              style={styles.trackPlayButton}
              onPress={() => handlePlayTrack(track)}
            >
              <Ionicons
                name={currentTrack?.id === track.id && isPlaying ? 'pause' : 'play'}
                size={20}
                color="#4A90E2"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Now Playing Bar */}
      {currentTrack && (
        <View style={styles.nowPlayingBar}>
          <Image source={{ uri: currentTrack.imageUrl }} style={styles.nowPlayingImage} />
          <View style={styles.nowPlayingInfo}>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.nowPlayingArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.nowPlayingButton}
            onPress={() => setIsPlaying(!isPlaying)}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={28}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}
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
  searchButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  playlistsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  playlistCard: {
    width: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  playlistGradient: {
    padding: 12,
  },
  playlistImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 12,
  },
  playlistInfo: {
    marginBottom: 8,
  },
  playlistTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  playlistTracks: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  playlistPlayButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
    gap: 6,
  },
  categoryTabActive: {
    backgroundColor: '#4A90E2',
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888888',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trackCardActive: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  trackImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  trackArtist: {
    fontSize: 13,
    color: '#888888',
    marginTop: 2,
  },
  trackDuration: {
    fontSize: 12,
    color: '#888888',
    marginRight: 12,
  },
  trackPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacing: {
    height: 30,
  },
  nowPlayingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2A4A',
    padding: 12,
    paddingBottom: 24,
  },
  nowPlayingImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nowPlayingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nowPlayingArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  nowPlayingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
