import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, StatusBar, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router'; 
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { useApp } from '../context/AppContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, t, language, level, xp } = useApp();
  const isAr = language === 'ar';
  
  // حالة البيانات الشخصية
  const [name, setName] = useState('Ahmed');
  const [email, setEmail] = useState('user@steppay.com');
  const [profileImage, setProfileImage] = useState('https://cdn-icons-png.flaticon.com/512/3135/3135715.png');

  // تحديث البيانات فور العودة للشاشة
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      const savedName = await AsyncStorage.getItem('user_name');
      const savedEmail = await AsyncStorage.getItem('user_email');
      const savedImage = await AsyncStorage.getItem('user_image');

      if (savedName) setName(savedName);
      if (savedEmail) setEmail(savedEmail);
      if (savedImage) setProfileImage(savedImage);
    } catch (e) {
      console.log('Error loading profile data');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(isAr ? 'عذراً' : 'Sorry', isAr ? 'نحتاج إذن للوصول للصور' : 'We need permissions to access photos');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const newImage = result.assets[0].uri;
      setProfileImage(newImage);
      await AsyncStorage.setItem('user_image', newImage);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* الهيدر العلوي */}
        <View style={styles.brandHeader}>
            <View style={styles.brandContainer}>
                <Text style={styles.brandText}>StePPay</Text>
                <Text style={styles.brandSlogan}>{isAr ? 'امشِ واربح' : 'Walk & Earn'}</Text>
            </View>
        </View>

        {/* منطقة البروفايل */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatarWrapper, { borderColor: colors.card }]}>
              <Image source={{ uri: profileImage }} style={styles.avatar} />
              <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>

          {/* الإحصائيات الحقيقية من AppContext */}
          <View style={[styles.statsCard, { backgroundColor: colors.card, shadowColor: colors.text }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.icon }]}>{level}</Text>
              <Text style={styles.statLabel}>{isAr ? 'المستوى' : 'Level'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{xp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>

          {/* القائمة المترجمة ودعم RTL */}
          <View style={styles.menuSection}>
            <Text style={[styles.menuTitle, { textAlign: isAr ? 'right' : 'left' }]}>
                {isAr ? 'الحساب' : 'Account'}
            </Text>
            
            {/* البيانات الشخصية */}
            <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card, flexDirection: isAr ? 'row-reverse' : 'row' }]} 
                onPress={() => router.push('/personal_details')} 
            >
              <View style={styles.menuIconBg}>
                <Ionicons name="person-outline" size={22} color="#4A90E2" />
              </View>
              <Text style={[styles.menuText, { color: colors.text, textAlign: isAr ? 'right' : 'left', marginHorizontal: 15 }]}>
                {isAr ? 'البيانات الشخصية' : 'Personal Details'}
              </Text>
              <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={20} color={colors.subText} />
            </TouchableOpacity>

            {/* الإنجازات */}
            <TouchableOpacity 
                style={[styles.menuItem, { backgroundColor: colors.card, flexDirection: isAr ? 'row-reverse' : 'row' }]} 
                onPress={() => router.push('/achievements')}
            >
              <View style={styles.menuIconBg}>
                <Ionicons name="trophy-outline" size={22} color="#F5A623" />
              </View>
              <Text style={[styles.menuText, { color: colors.text, textAlign: isAr ? 'right' : 'left', marginHorizontal: 15 }]}>
                {isAr ? 'الإنجازات' : 'Achievements'}
              </Text>
              <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={20} color={colors.subText} />
            </TouchableOpacity>
            
            <Text style={[styles.menuTitle, { marginTop: 20, textAlign: isAr ? 'right' : 'left' }]}>
                {isAr ? 'الإعدادات' : 'Settings'}
            </Text>
            
            {/* الإعدادات العامة */}
            <TouchableOpacity 
              style={[styles.menuItem, { backgroundColor: colors.card, flexDirection: isAr ? 'row-reverse' : 'row' }]} 
              onPress={() => router.push('/settings')} 
            >
              <View style={styles.menuIconBg}>
                <Ionicons name="settings-outline" size={22} color="#50E3C2" />
              </View>
              <Text style={[styles.menuText, { color: colors.text, textAlign: isAr ? 'right' : 'left', marginHorizontal: 15 }]}>
                {t('sec_general')}
              </Text>
              <Ionicons name={isAr ? "chevron-back" : "chevron-forward"} size={20} color={colors.subText} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  brandHeader: {
    height: 200, width: '100%', backgroundColor: '#4A90E2',
    alignItems: 'center', justifyContent: 'center',
    borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 30,
  },
  brandContainer: { alignItems: 'center' },
  brandText: {
    fontSize: 42, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5,
  },
  brandSlogan: {
    fontSize: 16, color: '#E3F2FD', fontWeight: '500', marginTop: 5,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  profileSection: { alignItems: 'center', marginTop: -50 },
  avatarContainer: { alignItems: 'center', justifyContent: 'center' },
  avatarWrapper: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 5, position: 'relative',
    backgroundColor: '#FFF', shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30, shadowRadius: 4.65, elevation: 8,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 55 },
  cameraButton: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4A90E2',
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  userInfo: { alignItems: 'center', marginTop: 12, marginBottom: 20 },
  userName: { fontSize: 26, fontWeight: 'bold' },
  userEmail: { fontSize: 14, color: '#888', marginTop: 2 },
  statsCard: {
    flexDirection: 'row', borderRadius: 20, padding: 20, width: '90%', justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 30,
  },
  statItem: { alignItems: 'center', flex: 1 },
  divider: { width: 1, height: '100%', marginHorizontal: 10 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 13, color: '#888', marginTop: 4 },
  menuSection: { width: '90%', marginBottom: 40 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#888', marginBottom: 10, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, marginBottom: 12 },
  menuIconBg: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: '#F5F7FA',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  menuText: { flex: 1, fontSize: 16, fontWeight: '600' },
});