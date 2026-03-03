import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Keyboard 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../api/client';

export default function ManualEntryScreen({ route, navigation }) {
  const { userId, editItem } = route.params || {};
  
  // Basic Info
  const [name, setName] = useState(editItem ? editItem.productName : '');
  const [cals, setCals] = useState(editItem ? String(editItem.calories || '') : '');
  
  // Macros
  const [protein, setProtein] = useState(editItem ? String(editItem.protein || '') : '');
  const [fat, setFat] = useState(editItem ? String(editItem.fat || '') : '');
  const [carbs, setCarbs] = useState(editItem ? String(editItem.carbs || '') : '');
  const [sugar, setSugar] = useState(editItem ? String(editItem.sugar || '') : '');

  // 🟢 Research Markers (The Smart Scoring Data)
  const [sodium, setSodium] = useState(editItem ? String(editItem.sodium_mg || '') : '');
  const [potassium, setPotassium] = useState(editItem ? String(editItem.potassium_mg || '') : '');
  const [gi, setGi] = useState(editItem ? String(editItem.glycemic_index || '') : '');
  const [iron, setIron] = useState(editItem ? String(editItem.iron_mg || '') : '');
  const [vitC, setVitC] = useState(editItem ? String(editItem.vitamin_c_mg || '') : '');

  const handleSave = async () => {
    if (!name || !cals) return Alert.alert("Error", "Food name and Calories are required");

    // 🟢 Build the Research-Ready Payload
    const payload = { 
        userId, 
        productName: name, 
        calories: Number(cals), 
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs: Number(carbs) || 0,
        sugar: Number(sugar) || 0,
        // Clinical Data
        sodium_mg: Number(sodium) || 0,
        potassium_mg: Number(potassium) || 0,
        glycemic_index: Number(gi) || 55, // Default medium GI
        iron_mg: Number(iron) || 0,
        vitamin_c_mg: Number(vitC) || 0,
        date: editItem ? editItem.date : new Date().toISOString() 
    };

    try {
      if (editItem) {
        await apiClient(`diary/${editItem._id}`, 'PUT', payload);
      } else {
        await apiClient('diary/add', 'POST', payload);
      }
      Keyboard.dismiss();
      navigation.goBack();
    } catch (e) { 
      Alert.alert("Error", "Save failed. Check your connection."); 
    }
  };

  const InputLabel = ({ label, icon }) => (
    <View style={styles.labelRow}>
      <MaterialCommunityIcons name={icon} size={14} color="#666" />
      <Text style={styles.label}> {label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{editItem ? "Edit Entry" : "Manual Meal Log"}</Text>
          
          <View style={styles.form}>
            <InputLabel label="Food Name" icon="food-apple-outline" />
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Avocado Toast" />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <InputLabel label="Calories" icon="fire" />
                <TextInput style={styles.input} keyboardType="numeric" value={cals} onChangeText={setCals} placeholder="kcal" />
              </View>
              <View style={{ flex: 1 }}>
                <InputLabel label="Glycemic Index" icon="speedometer" />
                <TextInput style={styles.input} keyboardType="numeric" value={gi} onChangeText={setGi} placeholder="1-100" />
              </View>
            </View>

            <Text style={styles.subTitle}>Macronutrients (g)</Text>
            <View style={styles.row}>
              <View style={styles.miniInputBox}><InputLabel label="Protein" icon="egg-outline" /><TextInput style={styles.input} keyboardType="numeric" value={protein} onChangeText={setProtein} /></View>
              <View style={styles.miniInputBox}><InputLabel label="Fat" icon="water-outline" /><TextInput style={styles.input} keyboardType="numeric" value={fat} onChangeText={setFat} /></View>
              <View style={styles.miniInputBox}><InputLabel label="Carbs" icon="bread-slice-outline" /><TextInput style={styles.input} keyboardType="numeric" value={carbs} onChangeText={setCarbs} /></View>
            </View>

            <Text style={styles.subTitle}>Research Markers (mg)</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}><InputLabel label="Sodium" icon="salt-shaker" /><TextInput style={styles.input} keyboardType="numeric" value={sodium} onChangeText={setSodium} placeholder="mg" /></View>
              <View style={styles.halfInput}><InputLabel label="Potassium" icon="pot-mix" /><TextInput style={styles.input} keyboardType="numeric" value={potassium} onChangeText={setPotassium} placeholder="mg" /></View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}><InputLabel label="Iron" icon="needle" /><TextInput style={styles.input} keyboardType="numeric" value={iron} onChangeText={setIron} placeholder="mg" /></View>
              <View style={styles.halfInput}><InputLabel label="Vitamin C" icon="pill" /><TextInput style={styles.input} keyboardType="numeric" value={vitC} onChangeText={setVitC} placeholder="mg" /></View>
            </View>
            
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editItem ? "Update Research Log" : "Log Meal Patterns"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelBtnText}>Discard Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F1F8E9' },
  scrollContainer: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1B5E20', marginBottom: 20, textAlign: 'center' },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10, marginTop: 5 },
  form: { backgroundColor: '#fff', padding: 20, borderRadius: 20, elevation: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginLeft: 5 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  input: { backgroundColor: '#FAFAFA', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E0EADF', fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  miniInputBox: { width: '30%' },
  halfInput: { width: '48%' },
  saveBtn: { backgroundColor: '#2E7D32', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { padding: 15, marginTop: 5, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontWeight: '600' }
});