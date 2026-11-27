import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './context/AppContext';

/**
 * Attribution for the free-license audio used in the Media library.
 * The CC-BY lines are license conditions and must stay verbatim;
 * sources and licenses are documented in
 * ~/workspace/steppay-review/media-sources-v1.md.
 */
const MEDIA_CREDITS: string[] = [
  '"New Start!" by PIKASONIC, licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0). Source: Wikimedia Commons.',
  '"Miss You" by PIKASONIC, licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0). Source: Wikimedia Commons.',
  '"Speed Energy" by WinnieTheMoog, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0). Source: Wikimedia Commons.',
  '"Game Mode" by WinnieTheMoog, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0). Source: Wikimedia Commons.',
  '"Clap Along With Me" by Sascha Ende, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0). Source: Wikimedia Commons.',
  '"Oceanwavescrushing" by Luftrum (freesound.org/people/Luftrum/sounds/48412), licensed under CC BY 3.0 (creativecommons.org/licenses/by/3.0).',
  'Quran audio: Islamic Network / AlQuran Cloud',
];

export default function InfoPage() {
  const router = useRouter();
  const { colors, t, language } = useApp();
  const isAr = language === 'ar';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isAr ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Text style={[styles.logoText, { color: '#4A90E2' }]}>StePPay</Text>
        <Text style={[styles.version, { color: colors.subText }]}>Version 1.0.0</Text>
        <Text style={[styles.description, { color: colors.text, textAlign: 'center' }]}>
          {isAr ? "تطبيقك الأول لتحويل خطواتك إلى مكافآت حقيقية." : "Your #1 app to turn your steps into real rewards."}
        </Text>
        <View style={styles.credits}>
          <Text style={[styles.creditsTitle, { color: colors.subText }]}>
            {isAr ? "مصادر الصوتيات" : "Media Credits"}
          </Text>
          {MEDIA_CREDITS.map((line) => (
            <Text key={line} style={[styles.creditLine, { color: colors.subText }]}>
              {line}
            </Text>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  logoText: { fontSize: 48, fontWeight: '900', marginBottom: 10 },
  version: { fontSize: 16, marginBottom: 30 },
  description: { fontSize: 18, lineHeight: 28 },
  credits: { marginTop: 40, alignItems: 'center' },
  creditsTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  creditLine: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 4 }
});