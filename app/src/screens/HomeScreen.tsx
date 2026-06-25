
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';

import { scheduleTestPing } from '../utils/NotificationHelper';

export default function HomeScreen() {
  const [clips, setClips] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const handleTestNotification = async () => {
    await scheduleTestPing();
    alert('Test notification scheduled for 5 seconds from now!');
  }

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.removeItem('userData');
    navigation.replace('Auth');
  };

  useEffect(() => {
    if (isFocused) {
      loadClips();
    }
  }, [isFocused]);

  const loadClips = async () => {
    setSyncStatus('syncing');
    try {
      const date = new Date().toISOString().split('T')[0];
      const response = await api.get(`/clips?date=${date}`);
      if (response.ok) {
        const data = await response.json();
        setClips(data);
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
        // Fallback to local if backend fails
        const clipsDir = `${FileSystem.documentDirectory}clips/`;
        try {
          const files = await FileSystem.readDirectoryAsync(clipsDir);
          setClips(files.map(f => `${clipsDir}${f}`));
        } catch {
          // Directory doesn't exist yet - that's fine
          setClips([]);
        }
      }
    } catch (error) {
      console.error('Failed to load clips:', error);
      setSyncStatus('offline');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tapestry</Text>
          <Text style={[styles.syncText, syncStatus === 'offline' && { color: 'red' }]}>
            {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'synced' ? 'Synced' : 'Offline'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('GroupList')} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {clips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No clips yet today.</Text>
          <Text style={styles.emptySubtext}>Wait for your next hourly ping!</Text>
        </View>
      ) : (
        <FlatList
          data={clips}
          keyExtractor={(item) => item}
          numColumns={3}
          renderItem={({ item, index }) => (
            <View style={styles.clipThumbnail}>
              <Text style={styles.clipNumber}>{index + 1}</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity 
        style={styles.testButton}
        onPress={handleTestNotification}
      >
        <Text style={styles.testButtonText}>Test Notification</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.captureButton}
        onPress={() => navigation.navigate('Camera')}
      >
        <Text style={styles.captureButtonText}>Capture Now (Dev)</Text>
      </TouchableOpacity>

      {clips.length > 0 && (
        <TouchableOpacity 
          style={styles.recapButton}
          onPress={() => navigation.navigate('Recap', { clips })}
        >
          <Text style={styles.recapButtonText}>Watch Daily Recap</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  syncText: {
    fontSize: 12,
    color: '#4CD964',
    fontWeight: '600',
    marginTop: -4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  iconButtonText: {
    fontWeight: '600',
  },
  list: {
    paddingBottom: 100,
  },
  clipThumbnail: {
    width: (Dimensions.get('window').width - 60) / 3,
    height: 150,
    backgroundColor: '#eee',
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  clipNumber: {
    fontSize: 24,
    color: '#aaa',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#888',
    marginTop: 10,
  },
  captureButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 30,
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#eee',
    padding: 15,
    borderRadius: 30,
    position: 'absolute',
    bottom: 170,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recapButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 30,
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  recapButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
