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

// Real privacy policy describing what StePPay actually collects and does,
// based on the app's code: email auth + step data via Supabase, profile
// details and settings on-device. The app does NOT collect location data
// and does NOT process payments.
const SECTIONS: Section[] = [
  {
    titleEn: '1. Information we collect',
    titleAr: '١. المعلومات التي نجمعها',
    bodyEn:
      'Account information: your email address and authentication credentials, managed securely through Supabase Auth when you create an account or sign in.\n\n' +
      'Activity data: step counts recorded by your device\u2019s motion sensor, and the values derived from them (estimated distance, calories, points and daily goal progress).\n\n' +
      'Profile information you choose to provide: name, phone number, age and a profile photo. These are stored on your device; your email is stored with your account.\n\n' +
      'Rewards activity: the rewards you redeem and the points you spend.\n\n' +
      'App preferences: theme, language and feature toggles, stored on your device.',
    bodyAr:
      'معلومات الحساب: بريدك الإلكتروني وبيانات تسجيل الدخول، وتُدار بأمان عبر خدمة Supabase Auth عند إنشاء حساب أو تسجيل الدخول.\n\n' +
      'بيانات النشاط: عدد الخطوات التي يسجلها حسّاس الحركة في جهازك، والقيم المشتقة منها (المسافة التقديرية والسعرات والنقاط وتقدّم الهدف اليومي).\n\n' +
      'معلومات الملف الشخصي التي تختار إضافتها: الاسم ورقم الهاتف والعمر وصورة الملف الشخصي. تُحفظ هذه على جهازك، بينما يُحفظ بريدك الإلكتروني مع حسابك.\n\n' +
      'نشاط المكافآت: المكافآت التي تستبدلها والنقاط التي تنفقها.\n\n' +
      'تفضيلات التطبيق: المظهر واللغة وإعدادات الميزات، وتُحفظ على جهازك.',
  },
  {
    titleEn: '2. What we do NOT collect',
    titleAr: '٢. ما لا نجمعه',
    bodyEn:
      'StePPay does not collect or track your location or GPS data. We do not access your contacts, messages, or files. We do not collect payment card details — the app does not process payments.',
    bodyAr:
      'لا يجمع تطبيق StePPay موقعك الجغرافي ولا يتعقّب بيانات GPS. ولا نصل إلى جهات اتصالك أو رسائلك أو ملفاتك. ولا نجمع بيانات بطاقات الدفع — فالتطبيق لا يعالج أي مدفوعات.',
  },
  {
    titleEn: '3. How we use your information',
    titleAr: '٣. كيف نستخدم معلوماتك',
    bodyEn:
      'We use your information only to operate the app: counting your steps, converting them into points and levels, showing your activity history and achievements, processing reward redemptions, and — when you are signed in and auto-sync is enabled — syncing your daily activity to your account so it is available across devices and after reinstalling.',
    bodyAr:
      'نستخدم معلوماتك فقط لتشغيل التطبيق: عدّ خطواتك، وتحويلها إلى نقاط ومستويات، وعرض سجلّ نشاطك وإنجازاتك، وتنفيذ عمليات استبدال المكافآت، و — عند تسجيل دخولك وتفعيل المزامنة التلقائية — مزامنة نشاطك اليومي مع حسابك لتجده متاحًا عبر أجهزتك وبعد إعادة تثبيت التطبيق.',
  },
  {
    titleEn: '4. Storage and security',
    titleAr: '٤. التخزين والأمان',
    bodyEn:
      'Data stored on your device is kept in the app\u2019s local storage. Data synced to your account is stored with our cloud provider (Supabase) and transmitted over encrypted connections (HTTPS). Access to account data is protected by your login credentials and by database rules that restrict every user to their own records only. No method of storage or transmission is 100% secure, but we apply reasonable safeguards appropriate to the data involved.',
    bodyAr:
      'تُحفظ البيانات الموجودة على جهازك داخل مساحة تخزين التطبيق المحلية. أما البيانات المتزامنة مع حسابك فتُحفظ لدى مزوّد الخدمة السحابية (Supabase) وتُنقل عبر اتصالات مشفّرة (HTTPS). ويُحمى الوصول إلى بيانات الحساب ببيانات تسجيل دخولك وبقواعد قاعدة بيانات تقصر كل مستخدم على سجلاته فقط. لا توجد وسيلة تخزين أو نقل آمنة بنسبة ١٠٠٪، لكننا نطبق إجراءات حماية معقولة تتناسب مع طبيعة البيانات.',
  },
  {
    titleEn: '5. Sharing your information',
    titleAr: '٥. مشاركة معلوماتك',
    bodyEn:
      'We do not sell your personal information. We share data only with the service providers needed to run the app (such as Supabase for authentication and database hosting), and only to the extent required to provide the service. We may disclose information if required by law.',
    bodyAr:
      'لا نبيع معلوماتك الشخصية. ولا نشارك البيانات إلا مع مزوّدي الخدمات اللازمين لتشغيل التطبيق (مثل Supabase للمصادقة واستضافة قاعدة البيانات)، وبالقدر المطلوب فقط لتقديم الخدمة. وقد نكشف عن معلومات إذا طلب القانون ذلك.',
  },
  {
    titleEn: '6. Your choices and rights',
    titleAr: '٦. خياراتك وحقوقك',
    bodyEn:
      'You can edit your profile details at any time in the app, turn step tracking or auto-sync off in Settings, and sign out at any time. The "Delete Account" option in Settings erases the app data stored on your device and signs you out. To request permanent deletion of your cloud account and its synced data, contact us through the support channel shown on the app\u2019s store listing page, and we will delete your account data within a reasonable period.',
    bodyAr:
      'يمكنك تعديل بيانات ملفك الشخصي في أي وقت داخل التطبيق، وإيقاف تتبّع الخطوات أو المزامنة التلقائية من الإعدادات، وتسجيل الخروج في أي وقت. خيار «حذف الحساب» في الإعدادات يمسح بيانات التطبيق المخزنة على جهازك ويسجّل خروجك. ولطلب حذف حسابك السحابي وبياناته المتزامنة نهائيًا، تواصل معنا عبر قناة الدعم الموضحة في صفحة التطبيق على المتجر، وسنحذف بيانات حسابك خلال فترة معقولة.',
  },
  {
    titleEn: '7. Children\u2019s privacy',
    titleAr: '٧. خصوصية الأطفال',
    bodyEn:
      'StePPay is not directed at children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us so we can delete it.',
    bodyAr:
      'تطبيق StePPay غير موجّه للأطفال دون سن ١٣ عامًا، ولا نجمع عن قصد معلومات شخصية من أطفال دون هذا السن. إذا كنت تعتقد أن طفلًا زوّدنا بمعلومات شخصية، فيرجى التواصل معنا لحذفها.',
  },
  {
    titleEn: '8. Changes to this policy',
    titleAr: '٨. التعديلات على هذه السياسة',
    bodyEn:
      'We may update this policy from time to time. Material changes will be reflected in this screen with a new "last updated" date. Continued use of the app after changes take effect means you accept the updated policy.\n\nLast updated: November 2026.',
    bodyAr:
      'قد نحدّث هذه السياسة من وقت لآخر. ستظهر التعديلات الجوهرية في هذه الشاشة مع تاريخ «آخر تحديث» جديد. واستمرارك في استخدام التطبيق بعد سريان التعديلات يعني قبولك للسياسة المحدّثة.\n\nآخر تحديث: نوفمبر ٢٠٢٦.',
  },
];

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
