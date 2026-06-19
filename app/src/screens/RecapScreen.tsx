
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Dimensions, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, MEDIA_URL } from '../utils/api';

export default function RecapScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { clips: initialClips, date: initialDate } = route.params || {};

  const [clips, setClips] = useState<string[]>(initialClips || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(!initialClips);
  const [vlogData, setVlogData] = useState<any>(null);
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    if (!initialClips) {
      fetchVlog();
    }
  }, []);

  const fetchVlog = async () => {
    setLoading(true);
    try {
      const date = initialDate || new Date().toISOString().split('T')[0];
      const response = await api.get(`/vlogs/${date}`);
      if (response.ok) {
        const data = await response.json();
        setVlogData(data);
        // If we have a generated file, we play that instead of individual clips
        setClips([`${MEDIA_URL}/${data.file_path}`]);
      } else {
        // If no vlog yet, we might want to play individual clips from the backend
        const clipsResponse = await api.get(`/clips?date=${date}`);
        if (clipsResponse.ok) {
          const clipsData = await clipsResponse.json();
          setClips(clipsData.map((c: any) => `${MEDIA_URL}/${c.file_path}`));
        }
      }
    } catch (error) {
      console.error('Fetch vlog error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      if (currentIndex < clips.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Loop or stay on last frame? 
        // For now just stay or show score
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (clips.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: '#fff' }}>No clips found for this day.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#007AFF' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={{ uri: clips[currentIndex] }}
        useNativeControls={clips.length === 1} // Use controls if it's the single merged file
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      
      <View style={styles.overlay}>
        {clips.length > 1 && (
          <View style={styles.progressContainer}>
            {clips.map((_: any, index: number) => (
              <View 
                key={index} 
                style={[
                  styles.progressBar, 
                  { backgroundColor: index <= currentIndex ? '#fff' : 'rgba(255,255,255,0.3)' }
                ]} 
              />
            ))}
          </View>
        )}
        
        <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {vlogData && (
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{vlogData.score}</Text>
            <Text style={styles.scoreLabel}>Daily Score</Text>
            {vlogData.score_breakdown && (
              <View style={styles.breakdown}>
                <Text style={styles.breakdownText}>
                  {vlogData.score_breakdown.clipCount} clips • {vlogData.score_breakdown.hourlyBonus} consistency bonus
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 50,
    paddingHorizontal: 10,
    pointerEvents: 'box-none',
  },
  progressContainer: {
    flexDirection: 'row',
    height: 3,
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: '100%',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 24,
  },
  scoreContainer: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 20,
    borderRadius: 20,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreLabel: {
    color: '#aaa',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  breakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  breakdownText: {
    color: '#888',
    fontSize: 12,
  },
});
