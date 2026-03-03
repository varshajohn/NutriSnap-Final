import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './app/navigation/AppNavigator';
import AuthNavigator from './app/navigation/AuthNavigator';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null); // Store the MongoDB _id

const handleLogin = (user) => {
  console.log("Logged in user ID:", user._id); 
  setUserId(user._id); // This MUST be set for the Navigator to have it
  setIsAuthenticated(true);
};

  const handleLogout = () => {
    setUserId(null);
    setIsAuthenticated(false);
  };

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <AppNavigator onLogout={handleLogout} userId={userId} />
      ) : (
        <AuthNavigator onLogin={handleLogin} />
      )}
    </NavigationContainer>
  );
}