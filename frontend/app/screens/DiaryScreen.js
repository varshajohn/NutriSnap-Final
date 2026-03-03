import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DiaryEntryCard from '../components/DiaryEntryCard';
import apiClient from '../../api/client';

const DiaryScreen = ({ userId, navigation }) => {
  const [diaryData, setDiaryData] = useState([]);
  const [recentMeals, setRecentMeals] = useState([]); // 🟢 State for Favorites
  const [loading, setLoading] = useState(true);

  const fetchDiary = useCallback(async () => {
    if (!userId) {
      setDiaryData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await apiClient(`diary/${userId}`);
      const entries = Array.isArray(data) ? data : [];

      // 1. Process Data for SectionList (Group by Date)
      const grouped = entries.reduce((acc, entry) => {
        const dateKey = new Date(entry.date).toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(entry);
        return acc;
      }, {});

      const sections = Object.keys(grouped)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => ({
          title: date,
          data: grouped[date],
          dailySodium: grouped[date].reduce((sum, item) => sum + (item.sodium_mg || 0), 0),
          dailyPotassium: grouped[date].reduce((sum, item) => sum + (item.potassium_mg || 0), 0)
        }));

      setDiaryData(sections);

      // 2. 🟢 Extract Unique Recent Meals for "Quick Add"
      const uniqueMeals = Array.from(new Set(entries.map(a => a.productName)))
        .map(name => entries.find(a => a.productName === name))
        .slice(0, 8); // Show top 8 recent unique items
      
      setRecentMeals(uniqueMeals);

    } catch (err) {
      console.error("Failed to fetch diary:", err);
      setDiaryData([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchDiary();
    }, [fetchDiary])
  );

  // 🟢 Logic: One-tap Quick Add
  const handleQuickAdd = async (meal) => {
    try {
      const payload = { 
        ...meal, 
        userId, 
        date: new Date().toISOString() 
      };
      delete payload._id; // Remove old MongoDB ID to create a new entry
      
      await apiClient('diary/add', 'POST', payload);
      Alert.alert("Success", `${meal.productName} added to today's log!`);
      fetchDiary(); // Refresh list
    } catch (e) {
      Alert.alert("Error", "Quick add failed.");
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Delete Entry", "Are you sure you want to remove this meal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient(`diary/${id}`, 'DELETE');
            fetchDiary();
          } catch (e) {
            Alert.alert("Error", "Failed to delete entry");
          }
        }
      }
    ]);
  };

  const handleEdit = (item) => {
    navigation.navigate('ManualEntry', { userId, editItem: { ...item } });
  };

  // 🟢 Component for the horizontal Quick Add list
  const renderQuickAddHeader = () => (
    <View style={styles.quickAddContainer}>
      <Text style={styles.quickAddTitle}>Quick Add Recent</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
        {recentMeals.map((meal, idx) => (
          <TouchableOpacity key={idx} style={styles.recentCard} onPress={() => handleQuickAdd(meal)}>
            <View style={styles.plusIconBadge}>
               <MaterialCommunityIcons name="plus" size={14} color="white" />
            </View>
            <Text style={styles.recentMealName} numberOfLines={1}>{meal.productName}</Text>
            <Text style={styles.recentMealCal}>{meal.calories} kcal</Text>
          </TouchableOpacity>
        ))}
        {recentMeals.length === 0 && (
          <Text style={styles.emptyRecentText}>Your frequent meals will appear here.</Text>
        )}
      </ScrollView>
    </View>
  );

  if (loading && diaryData.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Diary</Text>
      </View>

      <SectionList
        sections={diaryData}
        keyExtractor={(item) => item._id?.toString() || Math.random().toString()}
        ListHeaderComponent={renderQuickAddHeader} // 🟢 Add horizontal favorites at the top
        renderItem={({ item }) => (
          <DiaryEntryCard item={item} onDelete={handleDelete} onEdit={handleEdit} />
        )}
        renderSectionHeader={({ section }) => {
          const ratio = (section.dailySodium / Math.max(section.dailyPotassium, 1)).toFixed(1);
          const isHigh = ratio > 1.2;
          const statusLabel = ratio < 1.0 ? "Optimal" : ratio < 1.5 ? "Fair" : "High Salt";

          return (
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeader}>{section.title}</Text>
              <View style={[styles.ratioBadge, { backgroundColor: isHigh ? '#ffebee' : '#e8f5e9' }]}>
                <Text style={[styles.ratioText, { color: isHigh ? "#d32f2f" : "#2E7D32" }]}>
                  {statusLabel}: {ratio}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No entries yet. Start scanning!</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('ManualEntry', { userId })}>
        <Ionicons name="add" size={35} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FCF9' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1B5E20' },
  list: { paddingHorizontal: 20, paddingBottom: 130 },

  // 🟢 Quick Add Styles
  quickAddContainer: { marginTop: 15, marginBottom: 10 },
  quickAddTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  recentScroll: { flexDirection: 'row' },
  recentCard: { 
    backgroundColor: 'white', 
    padding: 12, 
    borderRadius: 18, 
    marginRight: 12, 
    width: 120, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    borderWidth: 1, 
    borderColor: '#E0EADF' 
  },
  plusIconBadge: { 
    backgroundColor: '#2E7D32', 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'absolute', 
    top: 8, 
    right: 8 
  },
  recentMealName: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 5, width: '85%' },
  recentMealCal: { fontSize: 10, color: '#2E7D32', marginTop: 2, fontWeight: '600' },
  emptyRecentText: { color: '#999', fontSize: 12, fontStyle: 'italic', paddingVertical: 10 },

  sectionHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 10 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
  ratioBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratioText: { fontSize: 11, fontWeight: 'bold' },

  fab: { position: 'absolute', bottom: 100, right: 20, backgroundColor: '#2E7D32', width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: 'gray' },
});

export default DiaryScreen;