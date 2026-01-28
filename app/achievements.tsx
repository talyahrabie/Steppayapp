import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from './context/AppContext';

const { width } = Dimensions.get('window');

export default function AchievementsScreen() {
  const router = useRouter();
  const { colors, steps, xp, level, t, language } = useApp();
  const isAr = language === 'ar';

  // قائمة الإنجازات المربوطة بالقاموس المحدث وبعدد الخطوات
  const badges = [
    { id: 1, title: t('badge_first_step'), target: 100, icon: 'footsteps', color: '#4CAF50' },
    { id: 2, title: t('badge_walker'), target: 1000, icon: 'walk', color: '#2196F3' },
    { id: 3, title: t('badge_warrior'), target: 5000, icon: 'fitness', color: '#FF9800' },
    { id: 4, title: t('badge_pro'), target: 10000, icon: 'trophy', color: '#9C27B0' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={language === 'ar' ? "dark-content" : "dark-content"} />
      
      {/* الهيدر المتفاعل مع اتجاه اللغة */}
      <View style={[styles.header, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isAr ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isAr ? 'الإنجازات' : 'Achievements'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* كارت المستوى ونقاط XP */}
        <View style={[styles.levelCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.levelSub, { color: colors.subText }]}>{t('current_level')}</Text>
          <Text style={[styles.levelTitle, { color: colors.icon }]}>{level}</Text>
          <View style={styles.xpBarBackground}>
             <View style={[styles.xpBarFill, { width: `${Math.min((xp / 5000) * 100, 100)}%` }]} />
          </View>
          <Text style={[styles.xpText, { color: colors.subText }]}>{xp} / 5000 XP</Text>
        </View>

        {/* شبكة الإنجازات مع نظام القفل 🔒 */}
        <View style={[styles.grid, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
          {badges.map((badge) => {
            const isUnlocked = steps >= badge.target;
            return (
              <View key={badge.id} style={styles.badgeWrapper}>
                <View style={[
                  styles.badgeCard, 
                  { backgroundColor: colors.card, borderColor: isUnlocked ? badge.color : colors.border },
                  !isUnlocked && styles.lockedBadge
                ]}>
                  
                  {/* أيقونة القفل */}
                  {!isUnlocked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={16} color="#888" />
                    </View>
                  )}

                  <Ionicons 
                    name={badge.icon as any} 
                    size={42} 
                    color={isUnlocked ? badge.color : '#BDC3C7'} 
                  />
                  
                  <Text style={[styles.badgeTitle, { color: isUnlocked ? colors.text : '#BDC3C7' }]}>
                    {badge.title}
                  </Text>
                  
                  <Text style={styles.targetText}>
                    {badge.target} {t('badge_desc')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', flex: 1, textAlign: 'center', marginRight: 34 },
  scrollContent: { padding: 20 },
  levelCard: {
    padding: 25, borderRadius: 24, alignItems: 'center', marginBottom: 30,
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12
  },
  levelSub: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  levelTitle: { fontSize: 36, fontWeight: '900', marginVertical: 8 },
  xpBarBackground: { height: 10, width: '100%', backgroundColor: '#E0E0E0', borderRadius: 5, marginTop: 10 },
  xpBarFill: { height: '100%', backgroundColor: '#4A90E2', borderRadius: 5 },
  xpText: { fontSize: 12, marginTop: 10, fontWeight: '500' },
  grid: { flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeWrapper: { width: (width - 60) / 2, marginBottom: 20 },
  badgeCard: {
    padding: 20, borderRadius: 22, alignItems: 'center', borderWidth: 2,
    height: 170, justifyContent: 'center', position: 'relative', elevation: 2
  },
  lockedBadge: { opacity: 0.6, borderStyle: 'dashed' },
  lockOverlay: { position: 'absolute', top: 12, right: 12 },
  badgeTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  targetText: { fontSize: 12, color: '#888', marginTop: 6, fontWeight: '500' },
});