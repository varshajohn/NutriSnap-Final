// FILE: app/navigation/AppNavigator.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import ManualEntryScreen from '../screens/ManualEntryScreen';
import HomeScreen from '../screens/HomeScreen';
import DiaryScreen from '../screens/DiaryScreen';
import ChatGPT from '../screens/ChatScreen'; 
import ScannerScreen from '../screens/ScannerScreen';
import ProfileNavigator from './ProfileNavigator';
import CameraScreen from '../screens/CameraScreen';
import DetectionResultScreen from '../screens/DetectionResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = ({ onLogout, userId }) => (
  <Tab.Navigator 
    screenOptions={({ route }) => ({
      headerShown: false, // We hide the global header for a cleaner look
      tabBarActiveTintColor: '#2E7D32', // NutriSnap Green
      tabBarInactiveTintColor: '#9E9E9E',
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 8,
      },
      tabBarStyle: {
        position: 'absolute',
        bottom: 20, // Lifted from the bottom
        left: 15,
        right: 15,
        elevation: 8, // Depth for Android
        backgroundColor: '#ffffff',
        borderRadius: 25, // Rounded pill shape
        height: 65,
        paddingBottom: 0,
        borderTopWidth: 0, // Removes the ugly grey line
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      tabBarIcon: ({ focused, color }) => {
        let iconName;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Diary') iconName = focused ? 'book-open-variant' : 'book-open-outline';
        else if (route.name === 'Scan') iconName = focused ? 'barcode-scan' : 'barcode';
        else if (route.name === 'Chat') iconName = focused ? 'robot-happy' : 'robot-happy-outline';
        else if (route.name === 'Profile') iconName = focused ? 'account' : 'account-outline';

        return (
          <View style={focused ? styles.activeTabCircle : null}>
            <MaterialCommunityIcons 
              name={iconName} 
              color={color} 
              size={focused ? 26 : 24} 
            />
          </View>
        );
      },
    })}
  >
<Tab.Screen name="Home">
  {props => <HomeScreen {...props} userId={userId} />}
</Tab.Screen>
<Tab.Screen name="Diary">
  {props => <DiaryScreen {...props} userId={userId} />}
</Tab.Screen>
    <Tab.Screen name="Scan">
      {props => <ScannerScreen {...props} userId={userId} />}
    </Tab.Screen>    
    <Tab.Screen name="Chat">
      {props => <ChatGPT {...props} userId={userId} />}
    </Tab.Screen>

    <Tab.Screen name="Profile">
      {() => <ProfileNavigator onLogout={onLogout} userId={userId} />}
    </Tab.Screen>
  </Tab.Navigator>
);

const AppNavigator = ({ onLogout, userId }) => (
  <Stack.Navigator>
    <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
      {() => <TabNavigator onLogout={onLogout} userId={userId} />}
    </Stack.Screen>
    <Stack.Screen name="Camera" component={CameraScreen} options={{ presentation: 'modal', headerShown: false }} />
    <Stack.Screen name="ManualEntry" component={ManualEntryScreen} options={{ title: 'Add Meal Manually' }} />
    <Stack.Screen 
   name="DetectionResult"
   component={DetectionResultScreen}
/>
  </Stack.Navigator>
);

const styles = StyleSheet.create({
  activeTabCircle: {
    backgroundColor: '#E8F5E9', // Light green highlight behind active icon
    padding: 6,
    borderRadius: 12,
    marginBottom: 2,
  }
});

export default AppNavigator;