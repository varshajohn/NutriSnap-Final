import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, Dimensions, ActivityIndicator, Modal, Animated, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Progress from 'react-native-progress'; 
import * as Haptics from 'expo-haptics'; // 🟢 Added Haptics
import NutritionSummaryCard from '../components/NutritionSummaryCard';
import apiClient from '../../api/client';

const { width } = Dimensions.get('window');

const HomeScreen = ({ userId }) => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [period, setPeriod] = useState("monthly");
  const [calendarVisible, setCalendarVisible] = useState(false);

  const shimmerValue = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerValue, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [loading]);

 const fetchHomeData = useCallback(async () => {
  if (!userId) return;

  console.log("Current Period:", period);

  try {
    const [u, s, r] = await Promise.all([
      apiClient(`user/${userId}`),
      apiClient(`todaySummary?userId=${userId}`),
      apiClient(`health/risk-assessment?userId=${userId}&period=${period}`)
    ]);

    setUser(u);
    setSummary(s);

    if (r && r.status === "Success") {
      console.log("RISK DATA:", r);
setRiskData(r);
    }

  } catch (e) {
    console.error("Home Fetch Error:", e);
  } finally {
    setLoading(false);
  }

}, [userId, period]);

  useFocusEffect(useCallback(() => { fetchHomeData(); }, [fetchHomeData]));
  useEffect(() => {
  fetchHomeData();
}, [period]);

  // 🟢 Logic: User-Friendly Status Labels
  const getStatus = (val) => {
    if (val > 70) return { label: 'High Alert', color: '#FF5252', bg: '#FFEBEE' };
    if (val > 40) return { label: 'Caution', color: '#FFAB40', bg: '#FFF3E0' };
    return { label: 'Optimal', color: '#4CAF50', bg: '#E8F5E9' };
  };

  // 🟢 Feature: Transparency (Show raw math on tile click)
  const showRawStats = (title) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!riskData?.rawTotals) {
        Alert.alert(title, "Gathering detailed biometric data...");
        return;
    }
    const stats = {
      'Salt Balance': `Sodium: ${riskData.rawTotals.sodium}mg\nPotassium: ${riskData.rawTotals.potassium}mg\nRatio: ${(riskData.rawTotals.sodium / (riskData.rawTotals.potassium || 1)).toFixed(2)}\n\n(Clinical Target: < 1.0)`,
      'Sugar Spikes': `Avg Daily Carbs: ${Math.round(riskData.rawTotals.carbs / 7)}g\nEstimated Glycemic Index: ${riskData.rawTotals.avgGI}\n\n(Clinical Target: < 80 GL)`,
      'Lifestyle & Obesity Trend': `Your TDEE: ${summary?.tdee || 'Calculated'}\nToday's Intake: ${summary?.calories}kcal\nStatus: ${riskData.indices.obesity}% Surplus Pattern`
    };
    Alert.alert(title, stats[title] || "Analysis in progress...");
  };

  const handleImprove = (type, val) => {
    Haptics.selectionAsync();
    const prompts = {
      Salt: `My Salt Balance risk is ${val}%. Can you suggest 3 specific low-sodium food swaps for my next meal?`,
      Sugar: `My Sugar Spike pattern is ${val}%. What fiber-rich foods can I add to my diet to stabilize this?`,
      Obesity: `My Lifestyle Trend shows a caloric surplus. Based on my TDEE, what's a realistic portion adjustment I can make?`
    };
    navigation.navigate('Chat', { initialMessage: prompts[type] });
  };

  // 🟢 Feature: Skeleton Loader
  if (loading && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scrollContent}>
          <Animated.View style={[styles.skeleton, { height: 30, width: '50%', opacity: shimmerValue, marginBottom: 20 }]} />
          <Animated.View style={[styles.skeleton, { height: 160, width: '100%', borderRadius: 30, opacity: shimmerValue, marginBottom: 30 }]} />
          <View style={styles.bentoGrid}>
            <Animated.View style={[styles.skeleton, { height: 140, width: '48%', borderRadius: 25, opacity: shimmerValue }]} />
            <Animated.View style={[styles.skeleton, { height: 140, width: '48%', borderRadius: 25, opacity: shimmerValue }]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 🟢 Feature: Empty States (For brand new users)
  if (!riskData || (riskData.indices.hypertension === 0 && riskData.indices.diabetes === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <MaterialCommunityIcons name="creation" size={100} color="#C8E6C9" />
          <Text style={styles.emptyTitle}>Engine is Warming Up</Text>
          <Text style={styles.emptySub}>We need at least 5 logs to calculate your clinical stability and disease risk patterns.</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Scan');
          }}>
            <Text style={styles.startBtnText}>Start Your First Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
// ---------------- CALENDAR GENERATION ----------------

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();

const firstDay = new Date(year, month, 1).getDay();
const daysInMonth = new Date(year, month + 1, 0).getDate();

const days = [];

// convert sunday start → monday start
const startOffset = firstDay === 0 ? 6 : firstDay - 1;

// empty cells
for (let i = 0; i < startOffset; i++) {
  days.push(<View key={"empty" + i} style={styles.dayCell} />);
}

// actual days
for (let d = 1; d <= daysInMonth; d++) {

  const badgeDay = riskData?.badgesCalendar?.find(b => {
    const date = new Date(b.date);
    return (
      date.getDate() === d &&
      date.getMonth() === month &&
      date.getFullYear() === year
    );
  });

  days.push(
    <View key={d} style={styles.dayCell}>
      <Text style={styles.dayText}>{d}</Text>
      {badgeDay && <View style={styles.badgeDot}/>}
    </View>
  );
}
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
  <View>
    <Text style={styles.dateText}>
      {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
    </Text>
    <Text style={styles.welcomeText}>Hey, {user?.name?.split(' ')[0]}! ✨</Text>
  </View>

  <View style={{flexDirection:"row", alignItems:"center"}}>

    <TouchableOpacity
      style={{marginRight:12}}
      onPress={() => setCalendarVisible(true)}
    >
      <MaterialCommunityIcons 
        name="trophy-outline" 
        size={26} 
        color="#2E7D32"
      />
    </TouchableOpacity>

    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
      <Image
        source={{ uri: user?.avatar || 'https://www.pngmart.com/files/23/Profile-PNG-Photo.png' }}
        style={styles.avatar}
      />
    </TouchableOpacity>

  </View>
</View>

        {/* 1. HERO: PROGRESSIVE ONBOARDING */}
        {!riskData?.isBiometricsComplete ? (
            <TouchableOpacity style={styles.onboardingCard} onPress={() => navigation.navigate('Profile')}>
                <View style={styles.onboardingIcon}><MaterialCommunityIcons name="lightning-bolt" size={30} color="#FFD54F" /></View>
                <View style={{flex: 1, marginLeft: 15}}>
                    <Text style={styles.onboardingTitle}>Unlock Personal Risk Scores</Text>
                    <Text style={styles.onboardingSub}>Add weight & height to calculate stability index.</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="white" />
            </TouchableOpacity>
        ) : (
            <View style={styles.heroCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Health Stability Score</Text>
                <Text style={styles.heroScore}>{riskData?.healthStability || 0}%</Text>
                <Text style={styles.heroSubText}>Resilience based on your metabolic patterns</Text>
              </View>
              <MaterialCommunityIcons name="shield-check" size={70} color="rgba(255,255,255,0.2)" />
            </View>
        )}
        {/* 🔥 DAILY STREAK */}
{riskData?.streak > 0 && (
<View style={styles.streakCard}>
  <Text style={styles.streakTitle}>🔥 {riskData.streak} Day Nutrition Streak</Text>
  <Text style={styles.streakSub}>Keep logging meals to maintain your streak!</Text>
</View>
)}
        {/* 2. RISK ANALYSIS GRID */}
        <View style={styles.riskDashboard}>
        <View style={styles.sectionHeaderRow}>
    <Text style={styles.sectionTitle}>Smart Risk Analysis</Text>
    <TouchableOpacity onPress={() => setInfoModalVisible(true)}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#2E7D32" />
    </TouchableOpacity>
</View>
        <View style={styles.toggleContainer}>
  <TouchableOpacity
    style={[styles.toggleBtn, period === "weekly" && styles.activeToggle]}
    onPress={() => setPeriod("weekly")}
  >
    <Text style={[styles.toggleText, period === "weekly" && styles.activeToggleText]}>
      Weekly
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.toggleBtn, period === "monthly" && styles.activeToggle]}
    onPress={() => setPeriod("monthly")}
  >
    <Text style={[styles.toggleText, period === "monthly" && styles.activeToggleText]}>
      Monthly
    </Text>
  </TouchableOpacity>
</View>
<Text style={{fontSize:12, color:'#666', marginBottom:5}}>
  Showing {period === "weekly" ? "Last 7 Days" : "Last 30 Days"} Analysis
</Text>
        <View style={styles.bentoGrid}>
          <RiskTile 
            title="Salt Balance" 
            value={riskData?.indices.hypertension || 0} 
            icon="heart-pulse" 
            status={getStatus(riskData?.indices.hypertension)} 
            onAction={() => handleImprove('Salt', riskData?.indices.hypertension)}
            onPress={() => showRawStats('Salt Balance')}
          />
          <RiskTile 
            title="Sugar Spikes" 
            value={riskData?.indices.diabetes || 0} 
            icon="water-percent" 
            status={getStatus(riskData?.indices.diabetes)} 
            onAction={() => handleImprove('Sugar', riskData?.indices.diabetes)}
            onPress={() => showRawStats('Sugar Spikes')}
          />
        </View>

        <WideRiskTile 
            title="Lifestyle & Obesity Trend" 
            value={riskData?.indices.obesity || 0} 
            icon="scale-bathroom" 
            status={getStatus(riskData?.indices.obesity)} 
            subtext="Persistent caloric energy gap analysis"
            onAction={() => handleImprove('Obesity', riskData?.indices.obesity)}
            onPress={() => showRawStats('Lifestyle & Obesity Trend')}
        />

        </View>

        {/* 3. DYNAMIC AI INSIGHT */}
        <TouchableOpacity style={styles.insightBox} onPress={() => navigation.navigate('Chat')}>
           <View style={styles.insightIconBg}>
              <MaterialCommunityIcons name="robot-confused-outline" size={22} color="#2E7D32" />
           </View>
           <View style={{ flex: 1 }}>
              <Text style={styles.insightLabel}>AI Clinical Insight</Text>
              <Text style={styles.insightText}>
                {riskData?.insights[0] || "Log more meals to unlock personalized patterns."}
              </Text>
           </View>
           <MaterialCommunityIcons name="chevron-right" size={20} color="#CCC" />
        </TouchableOpacity>

        {/* 4. DAILY PROGRESS */}
        <Text style={styles.sectionTitle}>Daily Progress</Text>
        <NutritionSummaryCard
          calories={summary?.calories || 0}
          protein={summary?.protein || 0}
          carbs={summary?.carbs || 0}
          fats={summary?.fat || 0}
        />

        {/* 5. TOOLS */}
        <Text style={styles.sectionTitle}>Smart Tools</Text>
        <View style={styles.toolGrid}>
          <ToolCard icon="camera" label="AI Snap" onPress={() => navigation.navigate('Camera', { userId })} />
          <ToolCard icon="barcode-scan" label="Barcode" onPress={() => navigation.navigate('Scan', { userId })} />
          <ToolCard icon="robot-happy" label="AI Coach" onPress={() => navigation.navigate('Chat')} />
        </View>

      </ScrollView>

      {/* MODAL */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Research Methodology</Text>
                <Text style={styles.modalPara}><Text style={{fontWeight: 'bold'}}>Stability:</Text> Overall resilience based on 30-day data.</Text>
                <Text style={styles.modalPara}><Text style={{fontWeight: 'bold'}}>Salt Balance:</Text> Based on Sodium-to-Potassium ratio targets (Ideal {"<"} 1.0).</Text>
                <Text style={styles.modalPara}><Text style={{fontWeight: 'bold'}}>Sugar Spikes:</Text> Measures insulin demand using Glycemic Load.</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setInfoModalVisible(false)}>
                    <Text style={styles.closeBtnText}>Got it!</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
      <Modal
visible={calendarVisible}
transparent
animationType="fade"
>
<View style={styles.modalOverlay}>

<View style={styles.calendarCard}>

<View style={styles.calendarHeader}>
<Text style={styles.calendarTitle}>March {new Date().getFullYear()}</Text>

<TouchableOpacity onPress={() => setCalendarVisible(false)}>
<MaterialCommunityIcons name="close" size={24} color="#333"/>
</TouchableOpacity>

</View>

<View style={styles.weekRow}>
{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
<Text key={d} style={styles.weekDay}>{d}</Text>
))}
</View>

<View style={styles.calendarGrid}>
{days}
</View>

</View>

</View>
</Modal>
    </SafeAreaView>
  );
};

/* --- SUB COMPONENTS --- */
const RiskTile = ({ title, value, icon, status, onAction, onPress }) => (
  <TouchableOpacity style={styles.tile} onPress={onPress}>
    <View style={styles.tileHeader}>
      <MaterialCommunityIcons name={icon} size={20} color={status.color} />
      <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
    <Text style={styles.tileTitle}>{title}</Text>
     <Progress.Bar
  progress={value / 100}
  width={width * 0.35}
  color={status.color}
  unfilledColor="#F0F0F0"
  borderWidth={0}
  height={6}
  animated={true}
  animationType="spring"
  animationConfig={{ duration: 600 }}
  style={{ marginTop: 10 }}
/>
    <TouchableOpacity style={{marginTop: 10}} onPress={onAction}>
        <Text style={[styles.improveLink, {color: status.color}]}>Improve →</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const WideRiskTile = ({ title, value, icon, status, subtext, onAction, onPress }) => (
    <TouchableOpacity style={styles.wideTile} onPress={onPress}>
        <View style={styles.tileHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name={icon} size={22} color={status.color} />
                <Text style={[styles.tileTitle, { marginLeft: 8 }]}>{title}</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
        </View>
        <Text style={styles.wideSubText}>{subtext}</Text>
        <View style={styles.wideProgressWrapper}>
            <Progress.Bar
  progress={value / 100}
  width={width - 165}
  color={status.color}
  unfilledColor="#F0F0F0"
  borderWidth={0}
  height={8}
  animated={true}
  animationType="spring"
  animationConfig={{ duration: 600 }}
/>
            <TouchableOpacity onPress={onAction}>
                <Text style={[styles.improveLink, {color: status.color, marginTop: 0}]}>Improve →</Text>
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
);


const ToolCard = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.toolCard} onPress={onPress}>
        <View style={styles.toolIconCircle}><MaterialCommunityIcons name={icon} size={24} color="#2E7D32" /></View>
        <Text style={styles.toolLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
  toggleContainer: {
  flexDirection: 'row',
  backgroundColor: '#E8F5E9',
  borderRadius: 20,
  padding: 4,
  marginBottom: 10
},

toggleBtn: {
  flex: 1,
  paddingVertical: 6,
  alignItems: 'center',
  borderRadius: 15
},

activeToggle: {
  backgroundColor: '#2E7D32'
},

toggleText: {
  fontSize: 12,
  fontWeight: 'bold',
  color: '#1B5E20'
},

activeToggleText: {
  color: 'white'
},
streakCard:{
backgroundColor:"#FFF7E6",
padding:16,
borderRadius:18,
marginTop:15,
borderWidth:1,
borderColor:"#FFE0B2"
},

streakTitle:{
fontSize:16,
fontWeight:"bold",
color:"#E65100"
},

streakSub:{
fontSize:12,
marginTop:4,
color:"#6D4C41"
},

badgeContainer:{
flexDirection:"row",
flexWrap:"wrap",
marginTop:10,
gap:8
},

badge:{
backgroundColor:"#E8F5E9",
paddingHorizontal:12,
paddingVertical:6,
borderRadius:20,
borderWidth:1,
borderColor:"#C8E6C9"
},

badgeText:{
fontSize:12,
fontWeight:"600",
color:"#2E7D32"
},
calendarCard:{
backgroundColor:"#FFF",
borderRadius:20,
padding:20,
width:"90%"
},

calendarHeader:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginBottom:10
},

calendarTitle:{
fontSize:18,
fontWeight:"bold"
},

weekRow:{
flexDirection:"row",
justifyContent:"space-between",
marginBottom:10
},

weekDay:{
width:30,
textAlign:"center",
fontSize:12,
color:"#666"
},

calendarGrid:{
flexDirection:"row",
flexWrap:"wrap"
},

dayCell:{
width:"14.2%",
alignItems:"center",
marginBottom:12
},

dayText:{
fontSize:12
},

badgeDot:{
width:8,
height:8,
borderRadius:5,
backgroundColor:"#4CAF50",
marginTop:4
},

  container: { flex: 1, backgroundColor: '#F9FCF9' },
  scrollContent: { padding: 20, paddingBottom: 130 },
  skeleton: { backgroundColor: '#EBEBEB', borderRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateText: { color: '#999', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  welcomeText: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20' },
  avatar: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#FFF' },
  
  // Empty State Styles
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20', marginTop: 20 },
  emptySub: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  startBtn: { backgroundColor: '#2E7D32', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 15, marginTop: 30 },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  onboardingCard: { backgroundColor: '#1B5E20', padding: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  onboardingIcon: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 15 },
  onboardingTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  onboardingSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 },
  heroCard: { backgroundColor: '#2E7D32', borderRadius: 30, padding: 25, flexDirection: 'row', alignItems: 'center', elevation: 8 },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 12 },
  heroScore: { color: 'white', fontSize: 48, fontWeight: 'bold' },
  heroSubText: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 15 },
  bentoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  tile: { backgroundColor: 'white', width: '48%', borderRadius: 25, padding: 18, elevation: 3 },
  wideTile: { backgroundColor: 'white', width: '100%', borderRadius: 25, padding: 20, marginTop: 15, elevation: 3 },
  tileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  tileTitle: { fontSize: 14, fontWeight: 'bold', color: '#444', marginTop: 8 },
  improveLink: { fontSize: 10, fontWeight: 'bold' },
  wideSubText: { fontSize: 12, color: '#999', marginTop: 4 },
  wideProgressWrapper: { marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  insightBox: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 25, marginTop: 20, alignItems: 'flex-start', borderWidth: 1, borderColor: '#F0F0F0', elevation: 2 },
  insightIconBg: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 12, marginRight: 15 },
  insightLabel: { fontSize: 11, fontWeight: 'bold', color: '#2E7D32', textTransform: 'uppercase', marginBottom: 4 },
  insightText: { fontSize: 14, color: '#444', fontStyle: 'italic', lineHeight: 20 },

  toolGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  toolCard: { backgroundColor: '#FFFFFF', width: '31%', borderRadius: 22, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: '#E0EADF', elevation: 2 },
  toolIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolLabel: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 25, borderRadius: 30 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20', marginBottom: 15 },
  modalPara: { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 12 },
  closeBtn: { backgroundColor: '#2E7D32', padding: 14, borderRadius: 15, marginTop: 10, alignItems: 'center' },
  closeBtnText: { color: 'white', fontWeight: 'bold' },
});

export default HomeScreen;