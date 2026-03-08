import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppTextInput from '../components/AppTextInput';
import apiClient from '../../api/client';

const validationSchema = Yup.object().shape({
  name: Yup.string().required().label('Name'),
  age: Yup.number().required().positive().integer().label('Age'),
  height: Yup.string().required().label('Height'),
  weight: Yup.string().required().label('Weight'),
});

const COMMON_ALLERGENS = [
  "Milk", "Eggs", "Peanuts", "Tree Nuts", "Soy", "Wheat", "Fish", "Shellfish", "Gluten"
];

const dietaryOptions = [
  "Vegetarian",
  "Non-Vegetarian",
  "Vegan",
  "Keto",
  "Low-Carb"
];

const EditProfileScreen = ({ navigation, route }) => {
  const { user } = route.params;

  const defaultPlaceholder = "https://www.pngmart.com/files/23/Profile-PNG-Photo.png";

  const [image, setImage] = useState(user.avatar || defaultPlaceholder);
  const [selectedAllergies, setSelectedAllergies] = useState(user.allergies || []);
  const [preference, setPreference] = useState(user.preference || "");

  const toggleAllergy = (allergy) => {
    if (selectedAllergies.includes(allergy)) {
      setSelectedAllergies(selectedAllergies.filter(a => a !== allergy));
    } else {
      setSelectedAllergies([...selectedAllergies, allergy]);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "We need access to your gallery to change your photo.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert("Delete Photo", "Reset to default profile picture?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: () => setImage("") }
    ]);
  };

  const handleSave = async (values) => {
    try {
      const dataToSave = {
        ...values,
        avatar: image,
        allergies: selectedAllergies,
        preference: preference,
        conditions: values.conditions
          ? values.conditions.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };

      await apiClient(`user/${user._id}`, 'PUT', dataToSave);
      Alert.alert("Success", "Profile updated successfully!");
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert("Update Failed", "Server error. Please check your connection.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Formik
          initialValues={{
            name: user.name,
            age: String(user.age),
            height: user.height,
            weight: user.weight,
            goal: user.goal || '',
            conditions: Array.isArray(user.conditions) ? user.conditions.join(', ') : '',
          }}
          onSubmit={handleSave}
          validationSchema={validationSchema}
        >
          {({ handleChange, handleSubmit, values, errors, touched }) => (
            <View style={styles.formContainer}>
              
              <View style={styles.imageContainer}>
                <Image source={{ uri: image || defaultPlaceholder }} style={styles.avatar} />
                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
                    <MaterialCommunityIcons name="camera" size={20} color="white" />
                  </TouchableOpacity>

                  {image !== "" && (
                    <TouchableOpacity style={styles.deleteIcon} onPress={handleDeletePhoto}>
                      <MaterialCommunityIcons name="trash-can" size={18} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.label}>Full Name</Text>
              <AppTextInput onChangeText={handleChange('name')} value={values.name} />
              {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Age</Text>
                  <AppTextInput onChangeText={handleChange('age')} value={values.age} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Weight (kg)</Text>
                  <AppTextInput onChangeText={handleChange('weight')} value={values.weight} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.label}>Height (cm)</Text>
              <AppTextInput onChangeText={handleChange('height')} value={values.height} keyboardType="numeric" />

              <Text style={styles.label}>My Allergies</Text>
              <View style={styles.chipContainer}>
                {COMMON_ALLERGENS.map((allergy) => (
                  <TouchableOpacity
                    key={allergy}
                    style={[styles.chip, selectedAllergies.includes(allergy) && styles.chipSelected]}
                    onPress={() => toggleAllergy(allergy)}
                  >
                    <Text style={[styles.chipText, selectedAllergies.includes(allergy) && styles.chipTextSelected]}>
                      {allergy}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { marginTop: 20 }]}>Health Goal</Text>
              <AppTextInput onChangeText={handleChange('goal')} value={values.goal} placeholder="e.g. Weight Loss" />

              <Text style={[styles.label, { marginTop: 20 }]}>Conditions</Text>
              <AppTextInput onChangeText={handleChange('conditions')} value={values.conditions} placeholder="e.g. Diabetes (comma separated)" />

              <Text style={[styles.label, { marginTop: 20 }]}>Dietary Preference</Text>
              <View style={styles.pickerContainer}>
                {dietaryOptions.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, preference === opt && styles.activeChip]}
                    onPress={() => setPreference(opt)}
                  >
                    <Text style={preference === opt ? styles.whiteText : styles.greenText}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit}>
                <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9' },
  scrollContent: { paddingBottom: 130 },
  formContainer: { 
    padding: 20, 
    backgroundColor: 'white', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    marginTop: 10,
    minHeight: '100%' 
  },
  imageContainer: { alignItems: 'center', marginBottom: 25 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#2E7D32', backgroundColor: '#eee' },
  imageActions: { flexDirection: 'row', position: 'absolute', bottom: -10, gap: 10 },
  cameraIcon: { backgroundColor: '#2E7D32', padding: 10, borderRadius: 25, borderWidth: 3, borderColor: 'white', elevation: 5 },
  deleteIcon: { backgroundColor: '#D32F2F', padding: 10, borderRadius: 25, borderWidth: 3, borderColor: 'white', elevation: 5 },
  label: { fontSize: 14, fontWeight: '700', color: '#1B5E20', marginTop: 15, marginBottom: 5 },
  row: { flexDirection: 'row' },
  error: { color: 'red', fontSize: 12, marginLeft: 5 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9', margin: 4, backgroundColor: '#F9FBF9' },
  chipSelected: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText: { color: '#4CAF50', fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: 'white' },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  activeChip: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  whiteText: { color: 'white', fontWeight: '600' },
  greenText: { color: '#2E7D32', fontWeight: '600' },
  saveBtn: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 15, marginTop: 40, alignItems: 'center', elevation: 4 },
  saveBtnText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
});