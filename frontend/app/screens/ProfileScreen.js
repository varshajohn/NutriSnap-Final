import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import InfoRow from '../components/InfoRow';
import TagList from '../components/TagList';
import apiClient from '../../api/client';

const ProfileScreen = ({ onLogout, userId }) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Map goal codes to human-readable text
  const goalMap = {
    weight_loss: 'Weight Loss',
    muscle_gain: 'Muscle Gain',
    maintenance: 'Healthy Maintenance',
  };

  const fetchData = async () => {
    try {
      const userData = await apiClient(`user/${userId}`);
      if (userData) setUser(userData);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchData();
  }, [isFocused, userId]);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { user });
  };

  const handleLogoutPress = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onLogout },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'gray', fontSize: 16 }}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <Image
            source={{
              uri:
                user.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,
            }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow
            icon="cake-variant-outline"
            label="Age"
            value={user.age ? `${user.age} years` : 'Not set'}
          />
          <InfoRow
            icon="human-male-height"
            label="Height"
            value={user.height ? `${user.height} cm` : 'Not set'}
          />
          <InfoRow
            icon="weight-kilogram"
            label="Weight"
            value={user.weight ? `${user.weight} kg` : 'Not set'}
          />

          {/* ✅ FIXED GOAL LINE */}
          <InfoRow
            icon="flag-checkered"
            label="Primary Goal"
            value={
              goalMap[user.goal] ||   // if stored as code
              user.goal ||            // if stored as readable text
              'Not set'
            }
          />
        </View>

        <View style={styles.healthContainer}>
          <TagList title="Allergies" data={user.allergies || []} />
          <TagList title="Health Conditions" data={user.conditions || []} />
        </View>

        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogoutPress}>
            <MaterialCommunityIcons name="logout" size={22} color="#d32f2f" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  name: { fontSize: 24, fontWeight: 'bold', marginTop: 15, color: '#333' },
  email: { fontSize: 16, color: 'gray', marginTop: 5 },
  editButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  editButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  detailsContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  healthContainer: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingTop: 20,
    paddingBottom: 5,
  },
  logoutContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 50,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffebee',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  logoutButtonText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default ProfileScreen;