import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // استدعاء المخزن

export default function PersonalDetailsScreen() {
  const router = useRouter();

  // الحالة المبدئية (فاضية لحد ما نحمل البيانات)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');

  // 1. أول ما الصفحة تفتح، نجيب البيانات المتسجلة
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedName = await AsyncStorage.getItem('user_name');
        const savedEmail = await AsyncStorage.getItem('user_email');
        const savedPhone = await AsyncStorage.getItem('user_phone');
        const savedAge = await AsyncStorage.getItem('user_age');

        // لو لقينا بيانات متسجلة نعرضها، لو مفيش نعرض القيم الافتراضية
        setName(savedName || 'Ahmed'); 
        setEmail(savedEmail || 'rabeead@hotmail.com');
        setPhone(savedPhone || '+20 123 456 7890');
        setAge(savedAge || '28');
        
      } catch (e) {
        console.error('فشل في تحميل البيانات', e);
      }
    };

    loadUserData();
  }, []);

  // 2. دالة الحفظ (بتخزن في الذاكرة الدائمة)
  const handleSave = async () => {
    try {
      // حفظ كل حقل لوحده
      await AsyncStorage.setItem('user_name', name);
      await AsyncStorage.setItem('user_email', email);
      await AsyncStorage.setItem('user_phone', phone);
      await AsyncStorage.setItem('user_age', age);

      Alert.alert("نجاح", "تم تحديث بياناتك وحفظها بنجاح! ✅", [
        { text: "OK", onPress: () => router.back() }
      ]);
      
    } catch (e) {
      Alert.alert("خطأ", "حصلت مشكلة أثناء الحفظ، حاول تاني.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>بياناتي الشخصية</Text>
          </View>

          <View style={styles.formContainer}>
            <InputField 
              label="الاسم" 
              icon="person-outline" 
              value={name} 
              onChangeText={setName} 
            />
            <InputField 
              label="البريد الإلكتروني" 
              icon="mail-outline" 
              value={email} 
              onChangeText={setEmail} 
              keyboardType="email-address" 
            />
            <InputField 
              label="رقم الهاتف" 
              icon="call-outline" 
              value={phone} 
              onChangeText={setPhone} 
              keyboardType="phone-pad" 
            />
            <InputField 
              label="العمر" 
              icon="calendar-outline" 
              value={age} 
              onChangeText={setAge} 
              keyboardType="numeric" 
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>حفظ التعديلات</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// (نفس المكون الفرعي للتصميم)
const InputField = ({ label, icon, value, onChangeText, keyboardType }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={20} color="#666" style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#999"
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 10 },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  formContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 25 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginLeft: 5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#EEEEEE' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', textAlign: 'left' },
  saveButton: { backgroundColor: '#4A90E2', paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});