import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

// إعدادات طريقة ظهور التنبيه (يظهر صوت ولا لأ، يظهر فوق التطبيق ولا لأ)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function NotificationsScreen() {
  const [isEnabled, setIsEnabled] = useState(false);

  // دالة طلب الإذن (أول ما الصفحة تفتح)
  useEffect(() => {
    async function requestPermissions() {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'لازم توافق على الإشعارات عشان توصلك المكافآت!');
      } else {
        setIsEnabled(true);
      }
    }
    requestPermissions();
  }, []);

  // دالة إرسال تنبيه تجريبي فوراً
  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "تجربة StePPay 🔔",
        body: "ممتاز! نظام الإشعارات شغال وزي الفل. 🚀",
        sound: true,
      },
      trigger: null, // null يعني ابعته فوراً
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>إعدادات الإشعارات</Text>
      
      {/* زرار التفعيل والقفل */}
      <View style={styles.settingRow}>
        <View style={styles.rowText}>
          <Text style={styles.settingTitle}>تفعيل التنبيهات</Text>
          <Text style={styles.settingSub}>استقبل أخبار المكافآت والتحديات</Text>
        </View>
        <Switch
          trackColor={{ false: "#767577", true: "#4A90E2" }}
          thumbColor={isEnabled ? "#fff" : "#f4f3f4"}
          onValueChange={() => setIsEnabled(!isEnabled)}
          value={isEnabled}
        />
      </View>

      {/* زرار تجربة (عشان تتأكد إنها شغالة) */}
      <TouchableOpacity style={styles.testButton} onPress={sendTestNotification}>
        <Ionicons name="notifications-outline" size={24} color="white" />
        <Text style={styles.testButtonText}>إرسال تنبيه تجريبي الآن</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F7FA' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#333', textAlign: 'center' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  rowText: { flex: 1 },
  settingTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  settingSub: { fontSize: 13, color: 'gray', marginTop: 4 },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  testButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});