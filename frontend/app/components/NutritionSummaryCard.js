// FILE: app/components/NutritionSummaryCard.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NutritionSummaryCard = ({ calories, protein, carbs, fats }) => (
  <View style={styles.card}>
    <Text style={styles.title}>Today's Summary</Text>
    <View style={styles.macrosContainer}>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{calories} g</Text>
        <Text style={styles.macroLabel}>kCal</Text>
      </View>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{protein} g</Text>
        <Text style={styles.macroLabel}>Protein</Text>
      </View>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{carbs} g</Text>
        <Text style={styles.macroLabel}>Carbs</Text>
      </View>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{fats} g</Text>
        <Text style={styles.macroLabel}>Fats</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    elevation: 4, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  macroLabel: {
    fontSize: 12,
    color: 'gray',
    marginTop: 4,
  },
});

export default NutritionSummaryCard;