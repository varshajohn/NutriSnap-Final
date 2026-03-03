// FILE: app/navigation/AuthNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = ({ onLogin }) => (
  <Stack.Navigator>
    <Stack.Screen name="Login" options={{ headerShown: false }}>
      {/* We pass the onLogin function down to the LoginScreen */}
      {(props) => <LoginScreen {...props} onLogin={onLogin} />}
    </Stack.Screen>
    <Stack.Screen
      name="Signup"
      component={SignupScreen}
      options={{ title: 'Create Account' }}
    />
  </Stack.Navigator>
);

export default AuthNavigator;