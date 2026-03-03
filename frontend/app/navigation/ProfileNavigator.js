// FILE: app/navigation/ProfileNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();

const ProfileNavigator = ({ onLogout, userId }) => (
  <Stack.Navigator>
    <Stack.Screen name="ProfileMain" options={{ headerShown: false }}>
      {(props) => <ProfileScreen {...props} onLogout={onLogout} userId={userId} />}
    </Stack.Screen>
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
  </Stack.Navigator>
);

export default ProfileNavigator;