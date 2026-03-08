import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DetectionResultScreen = ({ route, navigation }) => {

  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(true);

  const detections = route.params?.detections;
  const userId = route.params?.userId;

  if (!detections || detections.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>No detection result found.</Text>
      </SafeAreaView>
    );
  }

  const detection = detections[0];
  const { label, nutrition } = detection;
  console.log("Detection Data:", detection);
console.log("Nutrition Data:", detection.nutrition);
console.log("UserId received:", userId);
useEffect(() => {

  const fetchRecommendation = async () => {

    try {

      const res = await fetch(
        "https://unsubscribed-brittney-superably.ngrok-free.dev/api/recommend-food",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: userId,
            food: {
              name: label,
              ...nutrition
            }
          })
        }
      );

      const data = await res.json();

      console.log("Recommendation:", data);

      setRecommendation(data);

    } catch (err) {
      console.log("Recommendation error:", err);
    }

    setLoadingRecommendation(false);

  };

  if (nutrition && userId) {
    setRecommendation(null);
    setLoadingRecommendation(true);
    fetchRecommendation();
  }

}, [nutrition, userId]);
const handleAddToLog = async () => {

  if (!nutrition) {
    alert("Nutrition data unavailable for this food. Cannot log.");
    return;
  }

  try {

    const payload = {
      userId: userId,
      productName: label,

      calories: Number(nutrition.calories) || 0,
      protein: Number(nutrition.protein) || 0,
      fat: Number(nutrition.fat) || 0,
      carbs: Number(nutrition.carbs) || 0,
      sugar: Number(nutrition.sugar) || 0,

      sodium_mg: Number(nutrition.sodium) || 0,
      potassium_mg: Number(nutrition.potassium) || 0,

      glycemic_index: 55,
      iron_mg: 0,
      vitamin_c_mg: 0,

      date: new Date().toISOString()
    };

    const res = await apiClient("diary/add", "POST", payload);

  if (res) {
  alert(`${label} added to diary`);
  navigation.navigate("MainTabs", { screen: "Home" });
}

  } catch (err) {
    console.log("Add log error:", err);
    alert("Failed to add food to diary");
  }
};

  return (
    <SafeAreaView style={styles.container}>
  <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

      <View style={styles.header}>
        <MaterialCommunityIcons name="food-apple" size={28} color="#2E7D32" />
        <Text style={styles.headerTitle}>Detection Result</Text>
      </View>

      <Text style={styles.foodName}>
        {label?.toUpperCase()}
      </Text>

 <View style={styles.card}>

  <Text style={styles.sectionTitle}>Macronutrients</Text>

  <View style={styles.row}>
    <Text style={styles.label}>Calories</Text>
    <Text style={styles.value}>{nutrition?.calories ?? 0} kcal</Text>
  </View>

  <View style={styles.row}>
    <Text style={styles.label}>Protein</Text>
    <Text style={styles.value}>{nutrition?.protein ?? 0} g</Text>
  </View>

  <View style={styles.row}>
    <Text style={styles.label}>Carbohydrates</Text>
    <Text style={styles.value}>{nutrition?.carbs ?? 0} g</Text>
  </View>

  <View style={styles.row}>
    <Text style={styles.label}>Fat</Text>
    <Text style={styles.value}>{nutrition?.fat ?? 0} g</Text>
  </View>

  <View style={styles.divider} />

  <Text style={styles.sectionTitle}>Health Indicators</Text>

  <View style={styles.row}>
  <Text style={styles.label}>Sugar</Text>
  <Text style={styles.value}>
    {nutrition?.sugar !== undefined ? nutrition.sugar : "N/A"} g
  </Text>
</View>

<View style={styles.row}>
  <Text style={styles.label}>Fiber</Text>
  <Text style={styles.value}>
    {nutrition?.fiber !== undefined ? nutrition.fiber : "N/A"} g
  </Text>
</View>

<View style={styles.row}>
  <Text style={styles.label}>Sodium</Text>
  <Text style={styles.value}>
    {nutrition?.sodium !== undefined ? nutrition.sodium : "N/A"} mg
  </Text>
</View>

<View style={styles.row}>
  <Text style={styles.label}>Potassium</Text>
  <Text style={styles.value}>
    {nutrition?.potassium !== undefined ? nutrition.potassium : "N/A"} mg
  </Text>
</View>
</View>
{loadingRecommendation && (
  <Text style={{ textAlign: "center", marginBottom: 10 }}>
    Generating recommendation...
  </Text>
)}
{!loadingRecommendation && recommendation && (

<View style={styles.recommendationBox}>

<Text style={styles.recommendationTitle}>
{recommendation.ideal ? "✅ Good Choice" : "⚠ Not Ideal"}
</Text>

<Text style={styles.recommendationReason}>
{recommendation.reason}
</Text>

{!recommendation.ideal && (

<>
<Text style={styles.altTitle}>Better Options</Text>

{recommendation.alternatives.map((alt, index) => (
<Text key={index} style={styles.altItem}>
• {alt}
</Text>
))}

</>

)}

</View>

)}
<TouchableOpacity
  style={styles.logBtn}
  onPress={handleAddToLog}
>
  <MaterialCommunityIcons name="calendar-check" size={20} color="white" />
  <Text style={styles.btnText}> ADD TO LOG</Text>
</TouchableOpacity>
      <TouchableOpacity
  style={styles.primaryButton}
  onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
>
  <Text style={styles.primaryButtonText}>Back to Home</Text>
</TouchableOpacity>

      <TouchableOpacity
  style={styles.secondaryButton}
  onPress={() => navigation.navigate('Camera', { userId })}
>
        <Text style={styles.secondaryButtonText}>Scan Another Food</Text>
      </TouchableOpacity>

    </ScrollView>
</SafeAreaView>
  );
};

export default DetectionResultScreen;

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: '#F5F5F5',
  paddingHorizontal: 25,
  paddingTop: 20,
  paddingBottom: 20
},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 10,
  },
  foodName: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 25,
    letterSpacing: 2,
  },
  card: {
  backgroundColor: 'white',
  borderRadius: 20,
  paddingVertical: 25,
  paddingHorizontal: 20,
  elevation: 4,
  marginBottom: 20,
},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  label: {
    fontSize: 16,
    color: '#555',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
 primaryButton: {
  backgroundColor: "#2E7D32",
  paddingVertical: 16,
  borderRadius: 15,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 15
},
  secondaryButton: {
  backgroundColor: "#2E7D32",
  paddingVertical: 16,
  borderRadius: 15,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center"
},
  primaryButtonText: {
  color: "white",
  fontWeight: "bold",
  fontSize: 14
},

secondaryButtonText: {
  color: "white",
  fontWeight: "bold",
  fontSize: 14
},
  sectionTitle: {
  fontSize: 18,
  fontWeight: '700',
  marginBottom: 12,
  marginTop: 5,
  color: '#2E7D32'
},

divider: {
  height: 1,
  backgroundColor: '#E0E0E0',
  marginVertical: 15
},
recommendationBox: {
  backgroundColor: "#E8F5E9",
  padding: 16,
  borderRadius: 16,
  marginBottom: 20
},

recommendationTitle: {
  fontSize: 18,
  fontWeight: "bold",
  color: "#2E7D32",
  marginBottom: 8
},

recommendationReason: {
  fontSize: 14,
  color: "#333",
  marginBottom: 10
},

altTitle: {
  fontWeight: "bold",
  marginBottom: 5
},

altItem: {
  fontSize: 14,
  marginLeft: 6
},
logBtn: {
  backgroundColor: "#2E7D32",
  paddingVertical: 16,
  borderRadius: 15,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  marginBottom: 15
},

btnText: {
  color: "white",
  fontWeight: "bold",
  fontSize: 14
},
});