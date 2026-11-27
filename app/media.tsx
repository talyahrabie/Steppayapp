import React, { useState, useEffect, useRef } from 'react';
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
import { Audio } from 'expo-av';
import { useApp } from './context/AppContext';
import { trackEvent } from '../lib/analytics';

interface Track {
  id: string;
  title: string;
  /** Arabic title, shown when the app language is Arabic (if provided). */
  titleAr?: string;
  artist: string;
  duration: string;
  imageUrl: string;
  category: string;
  /**
   * Stream URL for this track. Tracks without one report an honest
   * "audio not available" error state (see handlePlayTrack) instead of
   * pretending to play. All wired URLs are free-license sources —
   * see the credits on the About (info) page and
   * ~/workspace/steppay-review/media-sources-v1.md for licenses.
   */
  audioUrl?: string;
}

interface Playlist {
  id: string;
  title: string;
  trackCount: number;
  imageUrl: string;
  colors: [string, string];
  /** Category whose first track starts playing when the playlist is tapped. */
  category: string;
}

const playlists: Playlist[] = [
  {
    id: '1',
    title: 'Morning Run',
    trackCount: 3,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398194158_4bfc8741.jpeg',
    colors: ['#4A90E2', '#357ABD'],
    category: 'running',
  },
  {
    id: '2',
    title: 'Workout Mix',
    trackCount: 3,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398198284_17563f2d.jpeg',
    colors: ['#E53935', '#C62828'],
    category: 'workout',
  },
  {
    id: '3',
    title: 'Relaxing Walk',
    trackCount: 3,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398201342_97f4fbdd.jpeg',
    colors: ['#26A69A', '#00897B'],
    category: 'relaxing',
  },
  {
    id: '4',
    title: 'Quran Recitation',
    trackCount: 3,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398204589_eaa4b862.jpeg',
    colors: ['#9575CD', '#7E57C2'],
    category: 'quran',
  },
  {
    id: '5',
    title: 'Azkar',
    trackCount: 3,
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398207838_aa4c12b6.jpeg',
    colors: ['#43A047', '#2E7D32'],
    category: 'azkar',
  },
];

/**
 * Audio library v1 (owner-approved structure): 5 categories × 3 tracks.
 * 14 of 15 tracks are wired to verified free-license streams (CC0,
 * public domain, CC-BY — credits on the About page — or the explicitly
 * free Islamic Network CDN); sources and licenses are documented in
 * ~/workspace/steppay-review/media-sources-v1.md. Post-Prayer Azkar has
 * NO verified free source, so it intentionally keeps no audioUrl and
 * shows the honest "audio not available yet" state.
 */
const tracks: Track[] = [
  // Running
  {
    id: '1',
    title: 'New Start!',
    artist: 'PIKASONIC',
    duration: '4:12',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398194158_4bfc8741.jpeg',
    category: 'running',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/08/New_Start%21_-_PIKASONIC-422729382.mp3',
  },
  {
    id: '2',
    title: 'Speed Energy',
    artist: 'WinnieTheMoog',
    duration: '1:45',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398194158_4bfc8741.jpeg',
    category: 'running',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Speed_Energy_by_WinnieTheMoog.ogg',
  },
  {
    id: '3',
    title: 'Dance of the Electronic Fairies',
    artist: 'Monplaisir',
    duration: '2:21',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398194158_4bfc8741.jpeg',
    category: 'running',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Monplaisir_-_03_-_Dance_of_the_electronic_fairies.ogg',
  },
  // Workout
  {
    id: '4',
    title: 'Miss You',
    artist: 'PIKASONIC',
    duration: '3:55',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398198284_17563f2d.jpeg',
    category: 'workout',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/17/Miss_You_-_PIKASONIC-440600472.mp3',
  },
  {
    id: '5',
    title: 'Clap Along With Me',
    artist: 'Sascha Ende',
    duration: '2:56',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398198284_17563f2d.jpeg',
    category: 'workout',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Clap_Along_With_Me_par_Sascha_Ende.mp3',
  },
  {
    id: '6',
    title: 'Game Mode',
    artist: 'WinnieTheMoog',
    duration: '0:40',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398198284_17563f2d.jpeg',
    category: 'workout',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Game_Mode_by_WinnieTheMoog.ogg',
  },
  // Relaxing
  {
    id: '7',
    title: 'Forest Evening Ambience',
    titleAr: 'أجواء الغابة المسائية',
    artist: 'Nature Sounds',
    duration: '3:11',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398201342_97f4fbdd.jpeg',
    category: 'relaxing',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Waidachswald_Oberschefflenz_Abend_20250616_2005.ogg',
  },
  {
    id: '8',
    title: 'Ocean Waves',
    titleAr: 'أمواج البحر',
    artist: 'Nature Sounds',
    duration: '2:00',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398201342_97f4fbdd.jpeg',
    category: 'relaxing',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Oceanwavescrushing.ogg',
  },
  {
    id: '9',
    title: 'Rain, Thunder & Birds',
    titleAr: 'مطر ورعد وطيور',
    artist: 'Nature Sounds',
    duration: '2:14',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398201342_97f4fbdd.jpeg',
    category: 'relaxing',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Rain_thunder_and_birds.ogg',
  },
  // Quran — Mishary Alafasy via the Islamic Network CDN (free for apps)
  {
    id: '10',
    title: 'Surah Al-Fatiha',
    titleAr: 'سورة الفاتحة',
    artist: 'Mishary Alafasy',
    duration: '1:29',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398204589_eaa4b862.jpeg',
    category: 'quran',
    audioUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/1.mp3',
  },
  {
    id: '11',
    title: 'Surah Ar-Rahman',
    titleAr: 'سورة الرحمن',
    artist: 'Mishary Alafasy',
    duration: '11:56',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398204589_eaa4b862.jpeg',
    category: 'quran',
    audioUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/55.mp3',
  },
  {
    id: '12',
    title: 'Surah Al-Mulk',
    titleAr: 'سورة الملك',
    artist: 'Mishary Alafasy',
    duration: '8:13',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398204589_eaa4b862.jpeg',
    category: 'quran',
    audioUrl: 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/67.mp3',
  },
  // Azkar
  {
    id: '13',
    title: 'Morning Azkar',
    titleAr: 'أذكار الصباح',
    artist: 'Azkar',
    duration: '24:31',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398207838_aa4c12b6.jpeg',
    category: 'azkar',
    // Provisional source (Public Domain Mark, owner-approved) — the
    // archive.org file name is percent-encoded, so this URL is
    // intentionally double-encoded; do not "fix" the encoding.
    audioUrl: 'https://archive.org/download/abuhassan_hotmail_2/2%20-%20%25D8%25A3%25D8%25B0%25D9%2583%25D8%25A7%25D8%25B1%20%25D8%25A7%25D9%2584%25D8%25B5%25D8%25A8%25D8%25A7%25D8%25AD.mp3',
  },
  {
    id: '14',
    title: 'Evening Azkar',
    titleAr: 'أذكار المساء — الشيخ عمر عبد الكافي',
    artist: 'Sheikh Omar Abdel Kafi',
    duration: '11:44',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398207838_aa4c12b6.jpeg',
    category: 'azkar',
    audioUrl: 'https://archive.org/download/02._2024031402./02.%D8%A3%D8%B0%D9%83%D8%A7%D8%B1%20%D8%A7%D9%84%D9%85%D8%B3%D8%A7%D8%A1%20%D9%84%D8%AA%D8%AD%D8%B5%D9%8A%D9%86%20%D9%86%D9%81%D8%B3%D9%83%20%D9%84%D9%84%D8%B4%D9%8A%D8%AE%20%D8%B9%D9%85%D8%B1%20%D8%B9%D8%A8%D8%AF%20%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A.mp3',
  },
  {
    // No verified free-license recording of post-prayer azkar exists —
    // intentionally left without an audioUrl (honest unavailable state).
    id: '15',
    title: 'Post-Prayer Azkar',
    titleAr: 'أذكار بعد الصلاة',
    artist: 'Azkar',
    duration: '0:00',
    imageUrl: 'https://d64gsuwffb70l.cloudfront.net/6976df9d18e95358de237c4f_1769398207838_aa4c12b6.jpeg',
    category: 'azkar',
  },
];

export default function MediaScreen() {
  const { t, language } = useApp();
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Category filter labels come from the app i18n dictionary (EN/AR).
  const categories = [
    { id: 'all', label: t('media_cat_all'), icon: 'musical-notes' as const },
    { id: 'running', label: t('media_cat_running'), icon: 'walk' as const },
    { id: 'workout', label: t('media_cat_workout'), icon: 'barbell' as const },
    { id: 'relaxing', label: t('media_cat_relaxing'), icon: 'leaf' as const },
    { id: 'quran', label: t('media_cat_quran'), icon: 'book' as const },
    { id: 'azkar', label: t('media_cat_azkar'), icon: 'moon' as const },
  ];

  /** عنوان المقطع بلغة التطبيق الحالية عند توفر ترجمة عربية. */
  const displayTitle = (track: Track) =>
    language === 'ar' && track.titleAr ? track.titleAr : track.title;

  const filteredTracks =
    activeCategory === 'all'
      ? tracks
      : tracks.filter((t) => t.category === activeCategory);

  // إيقاف وتفريغ الصوت عند مغادرة الشاشة
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  const stopCurrentSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('Error stopping sound:', e);
      }
      soundRef.current = null;
    }
  };

  /** تشغيل/إيقاف فعلي عبر expo-av — لا توجد محاكاة بعد الآن. */
  const handlePlayTrack = async (track: Track) => {
    setPlaybackError(null);

    // نفس المقطع: تبديل تشغيل/إيقاف مؤقت
    if (currentTrack?.id === track.id && soundRef.current) {
      try {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (e) {
        console.log('Error toggling playback:', e);
        setPlaybackError('Could not control playback. Please try again.');
      }
      return;
    }

    await stopCurrentSound();
    setCurrentTrack(track);
    setIsPlaying(false);

    // لا يوجد مصدر صوتي لهذا المقطع في البيانات الحالية → حالة خطأ صريحة
    if (!track.audioUrl) {
      setPlaybackError(`Audio for "${displayTitle(track)}" is not available yet.`);
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      // Analytics: a track actually started playing (category only).
      trackEvent('media_played', { category: track.category });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) setIsPlaying(false);
        }
      });
    } catch (e) {
      console.log('Error playing track:', e);
      setPlaybackError('Could not play this track. Check your connection and try again.');
      setIsPlaying(false);
    }
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    const firstTrack = tracks.find((t) => t.category === playlist.category);
    if (firstTrack) {
      setActiveCategory(playlist.category);
      handlePlayTrack(firstTrack);
    }
  };

  const renderPlaylist = ({ item }: { item: Playlist }) => (
    <TouchableOpacity style={styles.playlistCard} onPress={() => handlePlayPlaylist(item)}>
      <LinearGradient colors={item.colors} style={styles.playlistGradient}>
        <Image source={{ uri: item.imageUrl }} style={styles.playlistImage} />
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle}>{item.title}</Text>
          <Text style={styles.playlistTracks}>{item.trackCount} tracks</Text>
        </View>
        <TouchableOpacity style={styles.playlistPlayButton} onPress={() => handlePlayPlaylist(item)}>
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
              <Text style={styles.trackTitle}>{displayTitle(track)}</Text>
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

      {/* Playback error state */}
      {playbackError && (
        <View style={styles.errorBar}>
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <Text style={styles.errorText}>{playbackError}</Text>
          <TouchableOpacity onPress={() => setPlaybackError(null)}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Now Playing Bar */}
      {currentTrack && (
        <View style={styles.nowPlayingBar}>
          <Image source={{ uri: currentTrack.imageUrl }} style={styles.nowPlayingImage} />
          <View style={styles.nowPlayingInfo}>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>
              {displayTitle(currentTrack)}
            </Text>
            <Text style={styles.nowPlayingArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.nowPlayingButton}
            onPress={() => handlePlayTrack(currentTrack)}
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
  errorBar: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
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
