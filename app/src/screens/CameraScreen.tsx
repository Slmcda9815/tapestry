
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

export default function CameraScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<any>(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (isRecording && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isRecording && countdown === 0) {
      stopRecording();
    }
  }, [isRecording, countdown]);

  async function startRecording() {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setCountdown(5);
      const video = await cameraRef.current.recordAsync({
        maxDuration: 5,
      });
      console.log('Video recorded:', video.uri);
      await uploadClip(video.uri);
    } catch (error) {
      console.error('Failed to record video:', error);
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  }

  async function uploadClip(uri: string) {
    setSaving(true);
    try {
      // Create clip entry on backend
      const createRes = await api.post('/clips', { 
        timestamp: new Date().toISOString() 
      });
      
      if (!createRes.ok) {
        Alert.alert('Error', 'Failed to connect. Check your connection.');
        setSaving(false);
        return;
      }
      
      const clipData = await createRes.json();

      // Upload the video file directly
      const uploadRes = await api.uploadClip(clipData.id, uri);
      
      if (uploadRes.ok) {
        Alert.alert('Success', '5-second clip captured!', [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } else {
        Alert.alert('Error', 'Failed to upload clip. Check your connection.');
      }
    } catch (uploadError) {
      console.error('Failed to upload clip:', uploadError);
      Alert.alert('Error', 'Failed to upload. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  if (!cameraPermission || !micPermission) {
    // Permissions are still loading
    return <View />;
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    // Permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera and record audio</Text>
        <TouchableOpacity onPress={() => {
          requestCameraPermission();
          requestMicPermission();
        }} style={styles.button}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} mode="video">
        <View style={styles.buttonContainer}>
          {isRecording ? (
            <View style={styles.recordingIndicator}>
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={startRecording}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 64,
  },
  button: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'red',
  },
  recordingIndicator: {
    alignSelf: 'flex-end',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 50,
    width: 80,
    height: 80,
  },
  countdownText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
