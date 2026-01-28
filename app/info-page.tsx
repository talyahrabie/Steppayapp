import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './context/AppContext';

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
  description: { fontSize: 18, lineHeight: 28 }
});