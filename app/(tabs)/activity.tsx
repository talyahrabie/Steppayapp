import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, Alert, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import CategoryTabs from '../components/CategoryTabs';
import ExerciseCard from '../components/ExerciseCard';
import MiniPlayer from '../components/MiniPlayer';
// قمنا بإلغاء استيراد supabase مؤقتاً للتأكد من ظهور البيانات الجديدة
import { useApp } from '../context/AppContext';

interface Exercise {
  id: string;
  title: string;
  description: string;
  instructions: string;
  category: string;
  duration_minutes: number;
  difficulty: string;
  image_url: string;
}

export default function ActivityScreen() {
  const { colors, language } = useApp();
  const isAr = language === 'ar';
  
  const [activeCategory, setActiveCategory] = useState('exercises');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [activeMedia, setActiveMedia] = useState('quran');

  const streamUrls: any = {
    motivation: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
    energy: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',     
    calm: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',       
    quran: 'https://server7.mp3quran.net/shur/001.mp3',
  };

  // --- البيانات الجديدة (تمارين وأذكار) ---
  const staticExercises: Exercise[] = [
    // تمارين
    {
      id: 'ex1', category: 'exercises',
      title: isAr ? 'تمرين القرفصاء (Squats)' : 'Squats',
      description: isAr ? 'لتقوية عضلات الأرجل والمؤخرة' : 'Strengthens legs and glutes',
      instructions: isAr ? '1. قف مباعداً بين قدميك.\n2. اثنِ ركبتيك وكأنك تجلس على كرسي.\n3. حافظ على استقامة ظهرك ثم اصعد.' : 'Stand with feet apart. Bend knees like sitting.',
      duration_minutes: 10, difficulty: isAr ? 'مبتدئ' : 'Beginner',
      image_url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80'
    },
    {
      id: 'ex2', category: 'exercises',
      title: isAr ? 'تمرين الضغط (Push-ups)' : 'Push-ups',
      description: isAr ? 'لتقوية عضلات الصدر والذراعين' : 'Build upper body strength',
      instructions: isAr ? '1. استلقِ على وجهك.\n2. ضع كفيك بمحاذاة الكتفين.\n3. ادفع جسمك للأعلى ثم انزل ببطء.' : 'Get into plank position. Push back up.',
      duration_minutes: 10, difficulty: isAr ? 'متوسط' : 'Intermediate',
      image_url: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'
    },
    {
      id: 'ex3', category: 'exercises',
      title: isAr ? 'تمرين البلانك (Plank)' : 'Plank',
      description: isAr ? 'لشد عضلات البطن والجذع' : 'Core strength & stability',
      instructions: isAr ? '1. ارتكِز على ساعديك.\n2. حافظ على جسمك مستقيماً.\n3. اثبت لأطول فترة ممكنة.' : 'Rest on forearms. Keep body straight. Hold.',
      duration_minutes: 5, difficulty: isAr ? 'متوسط' : 'Intermediate',
      image_url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
    },
    
    // استرخاء
    {
      id: 'rel1', category: 'relaxation',
      title: isAr ? 'تنفس الصندوق' : 'Box Breathing',
      description: isAr ? 'تهدئة الأعصاب فوراً' : 'Calm your nervous system',
      instructions: isAr ? 'شهيق 4 ثوان - حبس 4 ثوان - زفير 4 ثوان.' : 'Inhale 4s, Hold 4s, Exhale 4s.',
      duration_minutes: 5, difficulty: isAr ? 'سهل' : 'Easy',
      image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80'
    },

    // تغذية
    {
      id: 'nut1', category: 'nutrition',
      title: isAr ? 'طبق السلطة المتكامل' : 'Power Salad',
      description: isAr ? 'وجبة خفيفة مليئة بالطاقة' : 'Energy boosting meal',
      instructions: isAr ? 'اخلط: سبانخ، طماطم، خيار، زيت زيتون.' : 'Mix Spinach, Tomatoes, Cucumber.',
      duration_minutes: 10, difficulty: isAr ? 'سهل' : 'Easy',
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'
    },

    // === الأذكار الجديدة ===
    {
      id: 'rem1', category: 'remembrances',
      title: 'سيد الاستغفار',
      description: 'من قالها موقناً بها دخل الجنة',
      instructions: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوئ لك بنعمتك علي وأبوئ بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت.',
      duration_minutes: 3, difficulty: 'ذكر',
      image_url: 'https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=800&q=80'
    },
    {
      id: 'rem2', category: 'remembrances',
      title: 'الباقيات الصالحات',
      description: 'أحب الكلام إلى الله',
      instructions: '- سبحان الله\n- والحمد لله\n- ولا إله إلا الله\n- والله أكبر',
      duration_minutes: 5, difficulty: 'ذكر',
      image_url: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?w=800&q=80'
    },
    {
      id: 'rem3', category: 'remembrances',
      title: 'الصلاة على النبي',
      description: 'صلى الله عليه وسلم',
      instructions: 'اللهم صل وسلم وبارك على سيدنا محمد.',
      duration_minutes: 5, difficulty: 'ذكر',
      image_url: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=800&q=80'
    },
    {
      id: 'rem4', category: 'remembrances',
      title: 'الحوقلة',
      description: 'كنز من كنوز الجنة',
      instructions: 'لا حول ولا قوة إلا بالله',
      duration_minutes: 2, difficulty: 'ذكر',
      image_url: 'https://images.unsplash.com/photo-1507643179173-39db4f9719ae?w=800&q=80'
    }
  ];

  const categories = [
    { id: 'exercises', label: isAr ? 'تمارين' : 'Exercises', icon: 'fitness' as const, color: '#4A90E2' },
    { id: 'relaxation', label: isAr ? 'استرخاء' : 'Relaxation', icon: 'leaf' as const, color: '#26A69A' },
    { id: 'nutrition', label: isAr ? 'تغذية' : 'Nutrition', icon: 'nutrition' as const, color: '#FFA726' },
    { id: 'remembrances', label: isAr ? 'أذكار' : 'Remembrances', icon: 'book' as const, color: '#9575CD' },
  ];

  const mediaSections = [
    { id: 'motivation', label: isAr ? 'تحفيز' : 'Motivation', icon: 'flash' as const, title: isAr ? 'بودكاست تحفيزي' : 'Motivation Podcast' },
    { id: 'energy', label: isAr ? 'طاقة' : 'Energy', icon: 'speedometer' as const, title: isAr ? 'موسيقى حماسية' : 'Energy Boost' },
    { id: 'calm', label: isAr ? 'هادئ' : 'Calm Walk', icon: 'sunny' as const, title: isAr ? 'مشي هادئ' : 'Calm Walk Melodies' },
    { id: 'quran', label: isAr ? 'قرآن' : 'Quran', icon: 'book' as const, title: isAr ? 'القرآن الكريم' : 'Holy Quran' },
  ];

  // --- هنا التغيير: إجبار التطبيق على استخدام البيانات الثابتة فقط ---
  useEffect(() => {
    setExercises(staticExercises); // تحميل البيانات فوراً
    setLoading(false); // إيقاف التحميل فوراً
  }, [language]); // إعادة التحميل عند تغيير اللغة

  useEffect(() => {
    setupAudio();
    return () => { if (sound) sound.unloadAsync(); };
  }, []);

  useEffect(() => { loadAudio(); }, [activeMedia]);

  const setupAudio = async () => {
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
        });
    } catch (e) { console.log('Audio setup error', e) }
  };

  const loadAudio = async () => {
    try {
      setIsBuffering(true);
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: streamUrls[activeMedia] },
        { shouldPlay: isPlaying }
      );
      setSound(newSound);
      setIsBuffering(false);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsBuffering(status.isBuffering);
            if (status.didJustFinish) setIsPlaying(false);
        }
      });
    } catch (error) { setIsBuffering(false); }
  };

  const handlePlayPause = async () => {
    if (!sound) return;
    isPlaying ? await sound.pauseAsync() : await sound.playAsync();
  };

  // التنقل بين أقسام الصوت (السابق/التالي في المشغّل المصغّر)
  const cycleMedia = (direction: 1 | -1) => {
    const index = mediaSections.findIndex(m => m.id === activeMedia);
    const nextIndex = (index + direction + mediaSections.length) % mediaSections.length;
    setIsPlaying(true);
    setActiveMedia(mediaSections[nextIndex].id);
  };

  const currentMedia = mediaSections.find(m => m.id === activeMedia);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#FFFFFF' ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerSte}>Ste</Text>
          <Text style={styles.headerPP}>PP</Text>
          <Text style={styles.headeray}>ay</Text>
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        
        <View style={styles.listSection}>
            {loading ? <ActivityIndicator size="small" color="#4A90E2" /> : 
              exercises.filter(ex => ex.category.toLowerCase() === activeCategory).map(ex => (
                <ExerciseCard
                  key={ex.id}
                  title={ex.title}
                  description={ex.description}
                  duration={ex.duration_minutes}
                  difficulty={ex.difficulty}
                  imageUrl={ex.image_url}
                  category={ex.category}
                  onStart={() => Alert.alert(
                    ex.title,
                    ex.instructions,
                    [{ text: isAr ? 'حسناً' : 'Ok' }]
                  )}
                />
              ))
            }
        </View>

        <View style={styles.mediaContainer}>
            <View style={[styles.mediaHeader, { alignItems: isAr ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.mediaMainTitle, { color: colors.text }]}>🎧 Move & Listen</Text>
                <Text style={styles.mediaSubTitle}>{isAr ? 'عزز خطواتك بالصوت' : 'Boost your steps with sound'}</Text>
            </View>

            <MiniPlayer
                title={isBuffering ? (isAr ? "جاري التحميل..." : "Buffering...") : (currentMedia?.title ?? '')}
                artist={isPlaying ? (isAr ? "استماع الآن" : "Listening Now") : (isAr ? "اضغط للتشغيل" : "Tap to play")}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNext={() => cycleMedia(1)}
                onPrevious={() => cycleMedia(-1)}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaTabsScroll}>
                <View style={[styles.mediaTabs, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
                    {mediaSections.map((cat) => (
                        <TouchableOpacity
                            key={cat.id}
                            style={[
                                styles.mediaTab,
                                { backgroundColor: colors.card },
                                activeMedia === cat.id && { borderColor: '#4A90E2', borderWidth: 2 }
                            ]}
                            onPress={() => {
                                setIsPlaying(true);
                                setActiveMedia(cat.id);
                            }}
                        >
                            <Ionicons name={cat.icon} size={18} color={activeMedia === cat.id ? '#4A90E2' : '#888'} />
                            <Text style={[styles.mediaTabLabel, { color: activeMedia === cat.id ? '#4A90E2' : '#888' }]}>
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 1 }, 
  headerSte: { color: '#4A90E2' }, 
  headerPP: { color: '#9B59B6' }, 
  headeray: { color: '#4CAF50' },
  scrollContent: { paddingHorizontal: 20 },
  listSection: { marginVertical: 10 },
  mediaContainer: { marginTop: 25, paddingBottom: 20 },
  mediaHeader: { marginBottom: 15 },
  mediaMainTitle: { fontSize: 20, fontWeight: 'bold' },
  mediaSubTitle: { fontSize: 13, color: '#888', marginTop: 2 },
  mediaTabsScroll: { marginTop: 15 },
  mediaTabs: { gap: 10 },
  mediaTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, gap: 8, elevation: 2 },
  mediaTabLabel: { fontSize: 13, fontWeight: '600' }
});