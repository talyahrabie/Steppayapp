import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, Image, Alert, Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import CategoryTabs from '../components/CategoryTabs';

const { width } = Dimensions.get('window');

interface RewardItem {
  id: string;
  title: string;
  subtitle: string;
  cost: number;
  category: string;
  image_url: string;
  brand_logo: string;
}

export default function RewardsScreen() {
  const { colors, language, steps, t } = useApp();
  const isAr = language === 'ar';
  
  // محاكاة الرصيد (كل 10 خطوات = 1 نقطة)
  const currentBalance = Math.floor(steps / 10);

  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: isAr ? 'الكل' : 'All', icon: 'apps' as const, color: '#4A90E2' },
    { id: 'giftcards', label: isAr ? 'كروت هدايا' : 'Gift Cards', icon: 'card' as const, color: '#F5A623' },
    { id: 'discounts', label: isAr ? 'خصومات' : 'Discounts', icon: 'pricetag' as const, color: '#FF5252' },
    { id: 'donations', label: isAr ? 'تبرعات' : 'Donations', icon: 'heart' as const, color: '#26A69A' },
  ];

  const rewards: RewardItem[] = [
    {
      id: 'r1', category: 'giftcards', cost: 5000,
      title: isAr ? 'بطاقة أمازون ١٠$' : '$10 Amazon Card',
      subtitle: isAr ? 'تسوق بحرية' : 'Shop anything',
      image_url: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=800&q=80',
      brand_logo: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Amazon_icon.png'
    },
    {
      id: 'r2', category: 'discounts', cost: 1500,
      title: isAr ? 'خصم ٢٠٪ ستاربكس' : '20% Off Starbucks',
      subtitle: isAr ? 'على أي مشروب' : 'Any handcrafted drink',
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
      brand_logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/1200px-Starbucks_Corporation_Logo_2011.svg.png'
    },
    {
      id: 'r3', category: 'donations', cost: 3000,
      title: isAr ? 'إطعام مسكين' : 'Feed a Child',
      subtitle: isAr ? 'تبرع عبر اليونيسيف' : 'Donate via Unicef',
      image_url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
      brand_logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Unicef_logo.png/600px-Unicef_logo.png'
    },
    {
      id: 'r4', category: 'giftcards', cost: 10000,
      title: isAr ? 'بطاقة آبل ٢٥$' : '$25 Apple Card',
      subtitle: isAr ? 'للتطبيقات والألعاب' : 'Apps, Games & more',
      image_url: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=800&q=80',
      brand_logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/800px-Apple_logo_black.svg.png'
    },
    {
      id: 'r5', category: 'discounts', cost: 800,
      title: isAr ? 'وجبة مجانية' : 'Free Burger King Meal',
      subtitle: isAr ? 'عند شراء وجبة أخرى' : 'Buy one get one free',
      image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80',
      brand_logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Burger_King_logo_%281999%29.svg/2024px-Burger_King_logo_%281999%29.svg.png'
    },
  ];

  const filteredRewards = activeCategory === 'all' ? rewards : rewards.filter(r => r.category === activeCategory);

  const handleRedeem = (item: RewardItem) => {
    if (currentBalance >= item.cost) {
        Alert.alert(isAr ? 'مبروك!' : 'Congrats!', isAr ? `تم استبدال ${item.title} بنجاح` : `You redeemed ${item.title}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.text === '#FFFFFF' ? "light-content" : "dark-content"} />
      
      <View style={[styles.header, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerSte}>Ste</Text><Text style={styles.headerPP}>PP</Text><Text style={styles.headeray}>ay</Text>
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={[styles.balanceCard, { flexDirection: isAr ? 'row-reverse' : 'row' }]}>
            <View>
                <Text style={styles.balanceLabel}>{isAr ? 'رصيدك الحالي' : 'Your Balance'}</Text>
                <Text style={styles.balanceValue}>{currentBalance.toLocaleString()} <Text style={styles.ptsText}>Pts</Text></Text>
            </View>
            <View style={styles.coinIconBg}>
                <MaterialCommunityIcons name="hand-coin" size={40} color="#FFD700" />
            </View>
        </View>

        <View style={{ marginVertical: 20 }}>
            <CategoryTabs categories={categories} activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        </View>

        <View style={styles.grid}>
            {filteredRewards.map((item) => {
                const canAfford = currentBalance >= item.cost;
                const progress = Math.min(currentBalance / item.cost, 1);

                return (
                    <View key={item.id} style={[styles.rewardCard, { backgroundColor: colors.card }]}>
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: item.image_url }} style={styles.rewardImage} />
                            <View style={styles.brandLogoBg}>
                                <Image source={{ uri: item.brand_logo }} style={styles.brandLogo} resizeMode="contain" />
                            </View>
                            <View style={styles.costBadge}>
                                <Text style={styles.costText}>{item.cost}</Text>
                                <MaterialCommunityIcons name="star-four-points" size={12} color="#FFF" />
                            </View>
                        </View>
                        
                        <View style={styles.cardContent}>
                            <Text style={[styles.rewardTitle, { color: colors.text, textAlign: isAr ? 'right' : 'left' }]}>{item.title}</Text>
                            <Text style={[styles.rewardSubtitle, { color: colors.subText, textAlign: isAr ? 'right' : 'left' }]}>{item.subtitle}</Text>

                            <View style={styles.cardFooter}>
                                {canAfford ? (
                                    <TouchableOpacity style={styles.redeemButton} onPress={() => handleRedeem(item)}>
                                        <Text style={styles.redeemText}>{isAr ? 'استبدال' : 'Redeem'}</Text>
                                        <Ionicons name={isAr ? "arrow-back-circle" : "arrow-forward-circle"} size={20} color="#FFF" />
                                    </TouchableOpacity>
                                ) : (
                                    // هنا كان الخطأ سابقاً وتم تصحيحه
                                    <View style={styles.progressContainer}>
                                        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                                            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                                        </View>
                                        <Text style={[styles.progressText, { color: colors.subText }]}>
                                            {currentBalance} / {item.cost} {isAr ? 'نقطة' : 'Pts'}
                                        </Text>
                                        <Text style={styles.needMoreText}>{isAr ? 'تحتاج المزيد' : 'Need more points'}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                );
            })}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 15, alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  headerSte: { color: '#4A90E2' }, headerPP: { color: '#9B59B6' }, headeray: { color: '#4CAF50' },
  scrollContent: { paddingHorizontal: 20 },
  balanceCard: {
    backgroundColor: '#4A90E2', borderRadius: 25, padding: 25,
    justifyContent: 'space-between', alignItems: 'center',
    shadowColor: "#4A90E2", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 5 },
  balanceValue: { color: '#FFF', fontSize: 36, fontWeight: 'bold' },
  ptsText: { fontSize: 20, fontWeight: '600' },
  coinIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  grid: { gap: 20 },
  rewardCard: { borderRadius: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  imageContainer: { height: 180, position: 'relative' },
  rewardImage: { width: '100%', height: '100%' },
  brandLogoBg: { position: 'absolute', top: 15, left: 15, width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  brandLogo: { width: 35, height: 35 },
  costBadge: { position: 'absolute', bottom: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5 },
  costText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  cardContent: { padding: 20 },
  rewardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  rewardSubtitle: { fontSize: 14, marginBottom: 20 },
  cardFooter: { marginTop: 'auto' },
  redeemButton: { backgroundColor: '#4A90E2', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 15, gap: 10 },
  redeemText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  progressContainer: { alignItems: 'center' },
  progressBarBg: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#F5A623' },
  progressText: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  needMoreText: { fontSize: 12, color: '#FF5252', marginTop: 2, fontWeight: '500' },
});