import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client'; 
import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export default function ScannerScreen({ navigation, userId }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState(null);
  
  const [userAllergies, setUserAllergies] = useState([]);
  const [detectedAllergens, setDetectedAllergens] = useState([]);

  // 🟢 COMPARISON STATE
  const [comparisonItem, setComparisonItem] = useState(null); 
  // 🟢 RECOMMENDATION STATE
const [recommendation, setRecommendation] = useState(null);
const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  const isProcessing = useRef(false);
  const isFocused = useIsFocused();

  // 1. Fetch Allergies
  useEffect(() => {
    const fetchUserAllergies = async () => {
      if (!userId) return;
      try {
        const data = await apiClient(`user/${userId}`);
        if (data && data.allergies) setUserAllergies(data.allergies);
      } catch (error) { console.error(error); }
    };
    fetchUserAllergies();
  }, [userId]);

  // 2. Start Comparison
  const handleCompare = () => {
    if (!productData) return;
    setComparisonItem(productData); // Store current scan as Item A
    resetScannerStateForNext(); // Reset camera only
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Comparison Mode", "Item A saved. Now scan Item B to compare.");
  };

  // 3. Translation
  const handleTranslate = async () => {
    if (!productData?.ingredients) return;
    setIsTranslating(true);
    try {
      const response = await apiClient('scan/translate', 'POST', { text: productData.ingredients });
      if (response && response.translatedText) {
        setTranslatedText(response.translatedText);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) { Alert.alert("Error", "Translation failed."); }
    finally { setIsTranslating(false); }
  };

  // 4. Add to Diary
  const handleAddToDiary = async () => {
    if (!userId || !productData) return;
    try {
      const payload = {
        userId,
        productName: productData.name || "Unknown Product",
        calories: Number(productData.calories) || 0,
        protein: Number(productData.protein) || 0,
        fat: Number(productData.fat) || 0,
        carbs: Number(productData.carbs) || 0,
        sugar: Number(productData.sugar) || 0,
        sodium_mg: Number(productData.sodium_mg) || 0,
        potassium_mg: Number(productData.potassium_mg) || 0,
        glycemic_index: Number(productData.glycemic_index) || 55,
        iron_mg: Number(productData.iron_mg) || 0,
        date: new Date().toISOString(),
      };

      const response = await apiClient('diary/add', 'POST', payload);
      if (response) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', `${productData.name} logged!`);
        resetScanner();
        navigation.navigate('Home');
      } 
    } catch (err) { Alert.alert('Error', 'Could not add to diary.'); }
  };
// 🟢 FETCH RECOMMENDATION
const fetchRecommendation = async (foodData) => {
  try {
    setLoadingRecommendation(true);

    const res = await apiClient('recommend-food', 'POST', {
      userId,
      food: {
        name: foodData.name,
        calories: foodData.calories,
        protein: foodData.protein,
        carbs: foodData.carbs,
        fat: foodData.fat,
        sugar: foodData.sugar,
        sodium: foodData.sodium_mg,
        potassium: foodData.potassium_mg
      }
    });

    setRecommendation(res);

  } catch (err) {
    console.log("Recommendation error:", err);
  }

  setLoadingRecommendation(false);
};
  const resetScannerStateForNext = () => {
  isProcessing.current = false; 
  setScanned(false);
  setProductData(null);
  setBarcode('');
  setDetectedAllergens([]);
  setTranslatedText(null);
  setRecommendation(null); // 
};

  const resetScanner = () => {
    resetScannerStateForNext();
    setComparisonItem(null);
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || isProcessing.current) return;
    isProcessing.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScanned(true);
    setLoading(true);
    setBarcode(data);

    try {
      const response = await apiClient('scan/analyze', 'POST', { barcode: data, allergies: userAllergies });
      if (response) {
  setProductData(response);
  setDetectedAllergens(response.detectedAllergens || []);

  // 🟢 FETCH RECOMMENDATION
  fetchRecommendation(response);
}
    } catch (error) {
      setScanned(false);
      isProcessing.current = false;
      Alert.alert("Error", "Product not found.");
    } finally { setLoading(false); }
  };

  const normalizeIngredientsText = (product) => {
    if (!product) return '';
    if (typeof product.ingredients === 'string') return product.ingredients;
    if (Array.isArray(product.ingredients)) return product.ingredients.join(', ');
    return '';
  };

  const getMarkerColor = (type, value) => {
    if (type === 'sodium' && value > 600) return '#D32F2F';
    if (type === 'gi' && value > 70) return '#E65100';
    return '#2E7D32';
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.sectionTitle}>Camera access required</Text>
          <TouchableOpacity style={styles.logButton} onPress={requestPermission}><Text style={styles.buttonText}>Grant Permission</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerSection}>
         <TouchableOpacity onPress={() => navigation.navigate('Home')}><Ionicons name="arrow-back" size={28} color="#1B5E20" /></TouchableOpacity>
         <Text style={styles.mainHeaderTitle}>NutriSnap Scanner</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {!scanned ? (
          <View style={styles.cameraWrapper}>
            {isFocused && (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "upc_a", "qr"] }}
              />
            )}
            <View style={styles.scanTarget} />
          </View>
        ) : loading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2E7D32" /><Text style={styles.fetchingText}>Clinical Safety Audit...</Text></View>
        ) : (
          <View style={styles.resultCard}>
            
            {/* 1. COMPARISON VIEW (TOP) */}
            {comparisonItem && productData && (
                <View style={styles.comparisonOverlay}>
                    <Text style={styles.compareTitle}>Clinical Comparison</Text>
                    <View style={styles.compareRow}>
                        <View style={styles.compareCol}>
                            <Text style={styles.compareItemName} numberOfLines={1}>{comparisonItem.name}</Text>
                            <Text style={styles.compareStat}>Salt: {comparisonItem.sodium_mg}mg</Text>
                            <Text style={styles.compareStat}>GI: {comparisonItem.glycemic_index}</Text>
                        </View>
                        <Text style={styles.vsText}>VS</Text>
                        <View style={styles.compareCol}>
                            <Text style={styles.compareItemName} numberOfLines={1}>{productData.name}</Text>
                            <Text style={styles.compareStat}>Salt: {productData.sodium_mg}mg</Text>
                            <Text style={styles.compareStat}>GI: {productData.glycemic_index}</Text>
                        </View>
                    </View>
                    <View style={styles.winnerBadge}>
                        <MaterialCommunityIcons name="shield-check" size={16} color="#2E7D32" />
                        <Text style={styles.winnerLabel}>
                            {productData.sodium_mg < comparisonItem.sodium_mg ? `Better Balance: ${productData.name}` : `Better Balance: ${comparisonItem.name}`}
                        </Text>
                    </View>
                </View>
            )}

            {/* 2. SAFETY & IMPACT */}
            {detectedAllergens.length > 0 && (
              <View style={styles.dangerCard}>
                <MaterialCommunityIcons name="shield-alert" size={24} color="#D32F2F" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.dangerTitle}>ALLERGEN ALERT!</Text>
                  <Text style={styles.dangerText}>{detectedAllergens.join(", ")}</Text>
                </View>
              </View>
            )}

            <View style={styles.impactBox}>
              <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={18} color="#2E7D32" />
              <Text style={styles.impactText}>
                {productData?.sodium_mg > 600 ? "High Sodium: Increases hypertension risk." : "Good choice for your stability goals."}
              </Text>
            </View>

            <Text style={styles.productName}>{productData?.name}</Text>

            {/* 3. CLINICAL MARKERS */}
            <View style={styles.clinicalGrid}>
                <View style={[styles.markerBox, { borderColor: getMarkerColor('sodium', productData?.sodium_mg) }]}>
                    <Text style={styles.markerLabel}>Sodium</Text>
                    <Text style={[styles.markerValue, { color: getMarkerColor('sodium', productData?.sodium_mg) }]}>{productData?.sodium_mg}mg</Text>
                </View>
                <View style={[styles.markerBox, { borderColor: getMarkerColor('gi', productData?.glycemic_index) }]}>
                    <Text style={styles.markerLabel}>Glycemic Index</Text>
                    <Text style={[styles.markerValue, { color: getMarkerColor('gi', productData?.glycemic_index) }]}>{productData?.glycemic_index}</Text>
                </View>
            </View>

            {/* 4. INGREDIENTS (RESTORED) */}
            <View style={styles.infoRow}>
                <View style={styles.rowBetween}>
                    <Text style={styles.infoLabel}>Ingredients:</Text>
                    {productData?.ingredients && !translatedText && (
                        <TouchableOpacity onPress={handleTranslate} disabled={isTranslating}>
                            {isTranslating ? <ActivityIndicator size="small" color="#2E7D32" /> : <Text style={styles.translateLink}>Translate to English</Text>}
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.ingredientsBox}>
                    <Text style={styles.ingredientsText}>
                        {translatedText || normalizeIngredientsText(productData) || "No ingredients data available."}
                    </Text>
                    {translatedText && (
                        <View style={styles.translatedBadge}>
                            <MaterialCommunityIcons name="translate" size={12} color="#2E7D32" />
                            <Text style={styles.translatedBadgeText}>AI Translated</Text>
                        </View>
                    )}
                </View>
            </View>

            {/* 5. NUTRITION SUMMARY */}
            <Text style={styles.nutritionTitle}>Nutrition per serving:</Text>
            <View style={styles.nutritionBox}>
              <Text style={styles.nutriLine}>Calories: {productData?.calories ?? "0"} kcal</Text>
                <Text style={styles.nutriLine}>Protein: {productData?.protein ?? "0"}g | Fat: {productData?.fat ?? "0"}g</Text>
                <Text style={styles.nutriLine}>Sugar: {productData?.sugar ?? "0"}g | Potassium: {productData?.potassium_mg ?? "0"}mg</Text>
            </View>
              {/* 🟢 AI RECOMMENDATION */}
{loadingRecommendation && (
  <ActivityIndicator size="small" color="#2E7D32" />
)}

{!loadingRecommendation && recommendation && (
  <View style={{
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20
  }}>
    <Text style={{
      fontWeight: "bold",
      fontSize: 16,
      marginBottom: 6,
      color: "#2E7D32"
    }}>
      {recommendation.ideal ? "✅ Good Choice" : "⚠ Not Ideal"}
    </Text>

    <Text style={{ fontSize: 13, marginBottom: 8 }}>
      {recommendation.reason}
    </Text>

    {!recommendation.ideal && (
      <>
        <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
          Better Options
        </Text>

        {recommendation.alternatives.map((alt, i) => (
          <Text key={i}>• {alt}</Text>
        ))}
      </>
    )}
  </View>
)}

            {/* 6. ACTION BUTTONS */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.logBtn} onPress={handleAddToDiary}>
                    <MaterialCommunityIcons name="calendar-check" size={20} color="white" />
                    <Text style={styles.btnText}> LOG MEAL</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.compareBtn} onPress={handleCompare}>
                    <MaterialCommunityIcons name="scale-balance" size={20} color="white" />
                    <Text style={styles.btnText}> COMPARE</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.scanAnotherBtn} onPress={resetScanner}><Text style={styles.buttonText}>SCAN ANOTHER</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  headerSection: { marginTop: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  mainHeaderTitle: { fontSize: 22, fontWeight: '800', color: '#1B5E20', marginLeft: 15 },
  cameraWrapper: { height: 400, width: '100%', borderRadius: 30, overflow: 'hidden', backgroundColor: '#000' },
  scanTarget: { position: 'absolute', top: '25%', left: '15%', width: '70%', height: '50%', borderWidth: 2, borderColor: '#4CAF50', borderRadius: 20, borderStyle: 'dashed' },
  loadingContainer: { height: 400, justifyContent: 'center', alignItems: 'center' },
  fetchingText: { marginTop: 15, color: '#2E7D32', fontWeight: 'bold' },
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 30, padding: 20, elevation: 5, shadowOpacity: 0.1 },
  productName: { fontSize: 20, fontWeight: 'bold', color: '#1B5E20', marginBottom: 15, textAlign: 'center' },
  
  // Comparison
  comparisonOverlay: { backgroundColor: '#F1F8E9', padding: 15, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#C8E6C9' },
  compareTitle: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase' },
  compareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareCol: { width: '42%', alignItems: 'center' },
  compareItemName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  compareStat: { fontSize: 11, color: '#666' },
  vsText: { fontWeight: '900', color: '#2E7D32' },
  winnerBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: '#E8F5E9', padding: 8, borderRadius: 10 },
  winnerLabel: { fontSize: 11, color: '#1B5E20', fontWeight: 'bold', marginLeft: 5 },

  impactBox: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  impactText: { flex: 1, fontSize: 12, color: '#2E7D32', marginLeft: 8 },
  dangerCard: { backgroundColor: '#FFEBEE', borderColor: '#D32F2F', borderWidth: 2, borderRadius: 15, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  dangerTitle: { color: '#D32F2F', fontWeight: 'bold', fontSize: 14 },
  dangerText: { color: '#B71C1C', fontSize: 12 },
  
  clinicalGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  markerBox: { width: '48%', padding: 12, borderRadius: 15, borderWidth: 1, backgroundColor: '#FAFAFA', alignItems: 'center' },
  markerLabel: { fontSize: 10, fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
  markerValue: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },

  infoRow: { marginBottom: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  infoLabel: { fontSize: 16, fontWeight: 'bold', color: '#424242' },
  ingredientsBox: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 12 },
  ingredientsText: { fontSize: 13, color: '#616161', lineHeight: 18 },
  translateLink: { fontSize: 12, fontWeight: 'bold', color: '#2E7D32', textDecorationLine: 'underline' },
  translatedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, alignSelf: 'flex-end', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  translatedBadgeText: { fontSize: 10, color: '#2E7D32', fontWeight: 'bold', marginLeft: 4 },

  nutritionTitle: { fontSize: 16, fontWeight: 'bold', color: '#424242', marginBottom: 8 },
  nutritionBox: { backgroundColor: '#E8F5E9', borderRadius: 15, padding: 15, marginBottom: 20 },
  nutriLine: { fontSize: 14, color: '#2E7D32', marginBottom: 4, fontWeight: '500' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  logBtn: { width: '48%', backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  compareBtn: { width: '48%', backgroundColor: '#2E7D32', paddingVertical: 16, borderRadius: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  scanAnotherBtn: { backgroundColor: '#333', paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});