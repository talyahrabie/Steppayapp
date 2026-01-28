import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface MiniPlayerProps {
  title: string;
  artist: string;
  imageUrl?: string;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  title,
  artist,
  imageUrl,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
}) => {
  const [progress, setProgress] = useState(0.35);

  return (
    <LinearGradient
      colors={['#1A2A4A', '#0D1B2A']}
      style={styles.container}
    >
      {/* Album art */}
      <View style={styles.albumArt}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.albumImage} />
        ) : (
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.albumPlaceholder}
          >
            <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
          </LinearGradient>
        )}
      </View>

      {/* Track info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.artistName} numberOfLines={1}>
          {artist}
        </Text>
        
        {/* Progress slider */}
        <View style={styles.progressContainer}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            onValueChange={setProgress}
            minimumTrackTintColor="#4A90E2"
            maximumTrackTintColor="rgba(255,255,255,0.3)"
            thumbTintColor="#4A90E2"
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={onPrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onPlayPause} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={onNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  albumArt: {
    marginRight: 12,
  },
  albumImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  albumPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  artistName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MiniPlayer;
