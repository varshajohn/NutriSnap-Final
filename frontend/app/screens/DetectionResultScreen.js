import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DetectionResultScreen = ({ route, navigation }) => {

  const detections = route.params?.detections;

  if (!detections || detections.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>No detection result found.</Text>
      </SafeAreaView>
    );
  }

  const detection = detections[0];
  const { label, nutrition } = detection;

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <MaterialCommunityIcons name="food-apple" size={28} color="#2E7D32" />
        <Text style={styles.headerTitle}>Detection Result</Text>
      </View>

      <Text style={styles.foodName}>
        {label?.toUpperCase()}
      </Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Calories</Text>
          <Text style={styles.value}>
            {nutrition?.calories ?? 0} kcal
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Protein</Text>
          <Text style={styles.value}>
            {nutrition?.protein ?? 0} g
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Carbohydrates</Text>
          <Text style={styles.value}>
            {nutrition?.carbs ?? 0} g
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Fat</Text>
          <Text style={styles.value}>
            {nutrition?.fats ?? 0} g
          </Text>
        </View>
      </View>

      <TouchableOpacity
  style={styles.primaryButton}
  onPress={() => navigation.popToTop()}
>
  <Text style={styles.primaryButtonText}>Back to Home</Text>
</TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={styles.secondaryButtonText}>Scan Another Food</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
};

export default DetectionResultScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 25,
    paddingTop: 40,
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
    marginBottom: 40,
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
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
});