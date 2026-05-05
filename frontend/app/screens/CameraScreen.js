// FILE: app/screens/CameraScreen.js (FINAL CORRECTED VERSION)
import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const CameraScreen = ({ navigation, route }) => {
const [loading, setLoading] = useState(false);
  const userId = route.params?.userId;
  console.log(" Camera userId:", userId);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  if (!permission) {
    // Permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Permissions are not granted yet
    return (
      <View style={styles.permissionContainer}>
        <Text style={{ textAlign: 'center', fontSize: 18 }}>We need your permission to use the camera</Text>
        <Button title={'Grant Permission'} onPress={requestPermission} />
      </View>
    );
  }

const takePicture = async () => {
  if (!cameraRef.current) return;

  setLoading(true); // 🔥 START LOADING

  try {
    const photo = await cameraRef.current.takePictureAsync();

    const formData = new FormData();
    formData.append("image", {
      uri: photo.uri,
      name: "photo.jpg",
      type: "image/jpeg",
    });
    formData.append("userId", userId);

    const response = await fetch(
      "https://unsubscribed-brittney-superably.ngrok-free.dev/api/detect-food",
      {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          "ngrok-skip-browser-warning": "true",
        },
      }
    );

    const data = await response.json();

    navigation.navigate("DetectionResult", {
      detections: data.detections,
      fallback: data.fallback || false,
      userId: userId
    });

  } catch (error) {
    console.error("Detection error:", error);
    alert("Detection failed");
  } finally {
    setLoading(false); // 🔥 STOP LOADING
  }
};
  return (
    <View style={styles.container}>
      {loading && (
  <View style={styles.loadingOverlay}>
    <Text style={styles.loadingText}>Analyzing your food...</Text>
  </View>
)}
      <CameraView 
        style={styles.camera} 
        ref={cameraRef}
        facing={'back'} 
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.innerButton} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={30} color="white" />
        </TouchableOpacity>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10
},

loadingText: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "600"
},
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
      position: 'absolute',
      top: 60,
      left: 30,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
  }

});

export default CameraScreen;