import React from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './context/AppContext';

export default function PrivacyPolicy() {
  const router = useRouter();
  const { colors, t, language } = useApp();
  const isAr = language === 'ar';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isAr ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, marginHorizontal: 15 }]}>{t('privacy')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.text, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}>
          {isAr ? "نحن في StePPay نهتم بخصوصيتك. يتم تشفير بيانات خطواتك وموقعك ولا يتم مشاركتها مع أي جهة خارجية." : "At StePPay, we value your privacy. Your steps and location data are encrypted and never shared with third parties."}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  text: { fontSize: 16, lineHeight: 24 }
});