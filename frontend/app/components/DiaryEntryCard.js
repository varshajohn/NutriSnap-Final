import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const DiaryEntryCard = ({ item, onDelete, onEdit }) => {
  // 🟢 Research Logic: Define clinical thresholds for "Warnings"
  const isHighSodium = item.sodium_mg > 600;      // 600mg+ in one item is high
  const isHighGI = item.glycemic_index > 70;      // 70+ is high glycemic index
  const isGoodIron = item.iron_mg > 2;            // 2mg+ is a significant iron source

  return (
    <View style={styles.card}>
      <View style={styles.infoContainer}>
        <Text style={styles.foodName}>{item.productName}</Text>
        <Text style={styles.calories}>{item.calories} kcal</Text>

        {/* 🟢 NEW: Research Badges Section */}
        <View style={styles.badgeRow}>
          {isHighSodium && (
            <View style={[styles.badge, { backgroundColor: '#ffebee' }]}>
              <Text style={[styles.badgeText, { color: '#d32f2f' }]}>High Sodium</Text>
            </View>
          )}
          {isHighGI && (
            <View style={[styles.badge, { backgroundColor: '#fff3e0' }]}>
              <Text style={[styles.badgeText, { color: '#e65100' }]}>High GI</Text>
            </View>
          )}
          {isGoodIron && (
            <View style={[styles.badge, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.badgeText, { color: '#2e7d32' }]}>Iron Rich</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => onEdit(item)}>
          <MaterialCommunityIcons name="pencil" size={22} color="#4CAF50" style={{marginRight: 15}} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item._id)}>
          <MaterialCommunityIcons name="trash-can-outline" size={22} color="#d32f2f" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoContainer: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  calories: { fontSize: 14, color: '#666', marginTop: 2 },
  
  // 🟢 Badge Styling
  badgeRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginTop: 8 
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  actionRow: { flexDirection: 'row', alignItems: 'center' }
});

export default DiaryEntryCard;