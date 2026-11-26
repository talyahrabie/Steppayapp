import React from 'react';
import { ScrollView, Text, StyleSheet, SafeAreaView, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './context/AppContext';

interface Section {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

const SECTIONS: Section[] = [
  {
    titleEn: '1. Acceptance of terms',
    titleAr: '١. قبول الشروط',
    bodyEn:
      'By downloading, accessing or using StePPay, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please do not use the app.',
    bodyAr:
      'بتنزيل تطبيق StePPay أو الوصول إليه أو استخدامه، فأنت توافق على شروط الخدمة هذه وعلى سياسة الخصوصية الخاصة بنا. إذا كنت لا توافق، فيرجى عدم استخدام التطبيق.',
  },
  {
    titleEn: '2. The service',
    titleAr: '٢. الخدمة',
    bodyEn:
      'StePPay is a fitness-motivation app that counts your steps using your device\u2019s motion sensor and converts them into points, levels and achievements that can be exchanged for rewards offered in the app. StePPay is not a medical device and does not provide medical advice; step, distance and calorie figures are estimates.',
    bodyAr:
      'تطبيق StePPay هو تطبيق للتحفيز الرياضي يعدّ خطواتك باستخدام حسّاس الحركة في جهازك ويحوّلها إلى نقاط ومستويات وإنجازات يمكن استبدالها بالمكافآت المعروضة داخل التطبيق. التطبيق ليس جهازًا طبيًا ولا يقدّم نصائح طبية؛ وأرقام الخطوات والمسافة والسعرات تقديرية.',
  },
  {
    titleEn: '3. Points and rewards',
    titleAr: '٣. النقاط والمكافآت',
    bodyEn:
      'Points are earned at the rate published in the app and have no cash or monetary value. Points cannot be transferred, sold, or exchanged outside the app. Rewards are subject to availability and may be changed or withdrawn at any time. We may adjust point balances that resulted from errors or misuse.',
    bodyAr:
      'تُكتسب النقاط بالمعدل المعلن داخل التطبيق، وليس لها أي قيمة نقدية أو مالية. ولا يمكن نقل النقاط أو بيعها أو استبدالها خارج التطبيق. المكافآت خاضعة للتوافر وقد تتغيّر أو تُسحب في أي وقت. ويحق لنا تعديل أرصدة النقاط الناتجة عن أخطاء أو سوء استخدام.',
  },
  {
    titleEn: '4. Your account',
    titleAr: '٤. حسابك',
    bodyEn:
      'You are responsible for the accuracy of the information you provide and for keeping your login credentials confidential. You are responsible for all activity that occurs under your account.',
    bodyAr:
      'أنت مسؤول عن دقة المعلومات التي تقدّمها وعن الحفاظ على سرية بيانات تسجيل دخولك. كما أنك مسؤول عن كل نشاط يتم عبر حسابك.',
  },
  {
    titleEn: '5. Acceptable use',
    titleAr: '٥. الاستخدام المقبول',
    bodyEn:
      'You agree not to manipulate step data (for example by artificially generating motion or tampering with the app), not to attempt to access other users\u2019 data, and not to use the app for any unlawful purpose. Accounts involved in abuse may be suspended and their points cancelled.',
    bodyAr:
      'توافق على عدم التلاعب ببيانات الخطوات (مثل توليد حركة مصطنعة أو العبث بالتطبيق)، وعدم محاولة الوصول إلى بيانات مستخدمين آخرين، وعدم استخدام التطبيق لأي غرض غير قانوني. وقد تُعلَّق الحسابات المتورطة في إساءة الاستخدام وتُلغى نقاطها.',
  },
  {
    titleEn: '6. Availability and changes',
    titleAr: '٦. التوافر والتعديلات',
    bodyEn:
      'We may update, change or discontinue parts of the service at any time. We are not liable for any interruption of the service or loss of points resulting from circumstances beyond our reasonable control.',
    bodyAr:
      'قد نحدّث أجزاء من الخدمة أو نغيّرها أو نوقفها في أي وقت. ولسنا مسؤولين عن أي انقطاع في الخدمة أو فقدان للنقاط ناتج عن ظروف خارجة عن سيطرتنا المعقولة.',
  },
  {
    titleEn: '7. Changes to these terms',
    titleAr: '٧. التعديلات على هذه الشروط',
    bodyEn:
      'We may update these terms from time to time; the current version is always available in this screen. Continued use of the app after changes take effect means you accept the updated terms.\n\nLast updated: November 2026.',
    bodyAr:
      'قد نحدّث هذه الشروط من وقت لآخر؛ والنسخة الحالية متاحة دائمًا في هذه الشاشة. واستمرارك في استخدام التطبيق بعد سريان التعديلات يعني قبولك للشروط المحدّثة.\n\nآخر تحديث: نوفمبر ٢٠٢٦.',
  },
];

export default function TermsOfService() {
  const router = useRouter();
  const { colors, t, language } = useApp();
  const isAr = language === 'ar';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isAr ? "arrow-forward" : "arrow-back"} size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, marginHorizontal: 15 }]}>{t('terms')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section) => (
          <View key={section.titleEn} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}>
              {isAr ? section.titleAr : section.titleEn}
            </Text>
            <Text style={[styles.text, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}>
              {isAr ? section.bodyAr : section.bodyEn}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  text: { fontSize: 15, lineHeight: 23 }
});
