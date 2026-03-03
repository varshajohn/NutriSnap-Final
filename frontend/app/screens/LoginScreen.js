import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
// Use the context version to fix the deprecation warning
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../../api/client';

const LoginScreen = ({ navigation, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginPress = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill in all fields");
    
    try {
      // .trim() removes any accidental spaces at the end of the email
      const userData = await apiClient('login', 'POST', { 
        email: email.trim(), 
        password: password 
      });
      onLogin(userData); 
    } catch (error) {
      // This catches the "Invalid Email or Password" error from the backend
      Alert.alert("Login Failed", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="food-apple" size={100} color="#4CAF50" />
          <Text style={styles.logoText}>NutriSnap</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            onChangeText={setEmail} 
            value={email} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            secureTextEntry 
            onChangeText={setPassword} 
            value={password} 
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupLink}>Sign Up</Text></Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    keyboardView: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    logoContainer: { alignItems: 'center', marginBottom: 40 },
    logoText: { fontSize: 40, fontWeight: 'bold', color: '#333' },
    formContainer: { width: '80%' },
    input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
    loginButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
    loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    signupText: { marginTop: 20, textAlign: 'center', color: 'gray' },
    signupLink: { color: '#4CAF50', fontWeight: 'bold' },
});

export default LoginScreen;