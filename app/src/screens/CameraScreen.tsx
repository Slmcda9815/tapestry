
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

export default function CameraScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
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
      await saveClip(video.uri);
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

  async function saveClip(uri: string) {
    try {
      const clipsDir = `${FileSystem.documentDirectory}clips/`;
      
      // Create clips directory (fails silently if exists)
      await FileSystem.makeDirectoryAsync(clipsDir, { intermediates: true }).catch(() => {});

      const filename = `clip_${Date.now()}.mov`;
      const newUri = `${clipsDir}${filename}`;
      await FileSystem.moveAsync({
        from: uri,
        to: newUri,
      });

      // Upload to backend
      try {
        const createRes = await api.post('/clips', { 
          timestamp: new Date().toISOString() 
        });
        if (createRes.ok) {
          const clipData = await createRes.json();
          await api.uploadClip(clipData.id, newUri);
        }
      } catch (uploadError) {
        console.error('Failed to upload clip:', uploadError);
        // We still have it locally, so we don't alert the user
      }

      Alert.alert('Success', '5-second clip captured!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (error) {
      console.error('Failed to save clip:', error);
      Alert.alert('Error', 'Failed to save clip.');
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
