// FILE: app/screens/SignupScreen.js

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Button,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';

import AppTextInput from '../components/AppTextInput';
import apiClient from '../../api/client';

// Validation rules
const validationSchema = Yup.object().shape({
  name: Yup.string().required().label('Name'),
  email: Yup.string().required().email().label('Email'),
  password: Yup.string().required().min(4).label('Password'),
  age: Yup.number().required().positive().integer().label('Age'),
  height: Yup.string().required().label('Height'),
  weight: Yup.string().required().label('Weight'),
});

const SignupScreen = ({ navigation }) => {
  
  const handleSignUp = async (values) => {
    try {
      // Send data to your new Node.js /api/register endpoint
      const result = await apiClient('register', 'POST', values);
      
      Alert.alert(
        "Success", 
        "Account created successfully! Please login.",
        [{ text: "OK", onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert("Registration Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Create Account</Text>
        <Text style={styles.subHeader}>Fill in your details to get started</Text>

        <Formik
          initialValues={{
            name: '',
            email: '',
            password: '',
            age: '',
            height: '',
            weight: '',
            goal: '',
            allergies: '',
            conditions: '',
          }}
          onSubmit={handleSignUp}
          validationSchema={validationSchema}
        >
          {({ handleChange, handleSubmit, values, errors, touched }) => (
            <View style={styles.form}>
              <Text style={styles.label}>Full Name *</Text>
              <AppTextInput
                placeholder="John Doe"
                onChangeText={handleChange('name')}
                value={values.name}
              />
              {touched.name && errors.name && <Text style={styles.error}>{errors.name}</Text>}

              <Text style={styles.label}>Email *</Text>
              <AppTextInput
                placeholder="email@example.com"
                onChangeText={handleChange('email')}
                value={values.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {touched.email && errors.email && <Text style={styles.error}>{errors.email}</Text>}

              <Text style={styles.label}>Password *</Text>
              <AppTextInput
                placeholder="Minimum 4 characters"
                onChangeText={handleChange('password')}
                value={values.password}
                secureTextEntry
              />
              {touched.password && errors.password && <Text style={styles.error}>{errors.password}</Text>}

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>Age *</Text>
                  <AppTextInput
                    placeholder="21"
                    onChangeText={handleChange('age')}
                    value={values.age}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Weight (kg) *</Text>
                  <AppTextInput
                    placeholder="60"
                    onChangeText={handleChange('weight')}
                    value={values.weight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Height (cm) *</Text>
              <AppTextInput
                placeholder="170"
                onChangeText={handleChange('height')}
                value={values.height}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Health Goal</Text>
              <AppTextInput
                placeholder="e.g. Lose weight, Muscle gain"
                onChangeText={handleChange('goal')}
                value={values.goal}
              />

              <Text style={styles.label}>Allergies (comma-separated)</Text>
              <AppTextInput
                placeholder="e.g. Peanuts, Dairy"
                onChangeText={handleChange('allergies')}
                value={values.allergies}
              />

              <Text style={styles.label}>Health Conditions</Text>
              <AppTextInput
                placeholder="e.g. Diabetes, Hypertension"
                onChangeText={handleChange('conditions')}
                value={values.conditions}
              />

              <View style={styles.buttonContainer}>
                <Button title="Register" onPress={handleSubmit} color="#4CAF50" />
              </View>
              
              <TouchableOpacity 
                style={{ marginTop: 15, alignItems: 'center' }} 
                onPress={() => navigation.goBack()}
              >
                <Text style={{ color: 'gray' }}>Already have an account? <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Login</Text></Text>
              </TouchableOpacity>
            </View>
          )}
        </Formik>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subHeader: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 20,
  },
  form: {
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  error: {
    color: 'red',
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 30,
  },
});

import { TouchableOpacity } from 'react-native'; // Added this missing import
export default SignupScreen;