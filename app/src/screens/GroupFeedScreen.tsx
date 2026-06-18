
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import { api } from '../utils/api';

export default function GroupFeedScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { groupId, groupName } = route.params;

  const [tab, setTab] = useState<'feed' | 'members'>('feed');
  const [vlog, setVlog] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused, tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      
      if (tab === 'feed') {
        const response = await api.get(`/groups/${groupId}/vlog/${date}`);
        if (response.ok) {
          const data = await response.json();
          setVlog(data);
        } else {
          setVlog(null);
        }
      } else {
        const response = await api.get(`/groups/${groupId}/members`);
        if (response.ok) {
          const data = await response.json();
          setMembers(data);
        }
      }
    } catch (error) {
      console.error('Load group feed error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const response = await api.post(`/groups/${groupId}/vlog/${date}/generate`, {});
      if (response.ok) {
        alert('Group vlog generation started! Check back in a minute.');
      }
    } catch (error) {
      console.error('Generate vlog error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const renderMember = ({ item }: { item: any }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]}</Text>
        </View>
        <Text style={styles.memberName}>{item.name}</Text>
      </View>
      <View style={[styles.statusBadge, item.clips_today > 0 ? styles.statusCaptured : styles.statusMissing]}>
        <Text style={styles.statusText}>{item.clips_today > 0 ? 'Captured' : 'Missing'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{groupName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, tab === 'feed' && styles.activeTab]} 
          onPress={() => setTab('feed')}
        >
          <Text style={[styles.tabText, tab === 'feed' && styles.activeTabText]}>Daily Recap</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, tab === 'members' && styles.activeTab]} 
          onPress={() => setTab('members')}
        >
          <Text style={[styles.tabText, tab === 'members' && styles.activeTabText]}>Members</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
      ) : tab === 'feed' ? (
        <View style={styles.content}>
          {vlog ? (
            <View style={styles.vlogContainer}>
              <Video
                style={styles.video}
                source={{ uri: `http://localhost:3000/${vlog.file_path}` }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
              />
              <TouchableOpacity style={styles.regenerateButton} onPress={handleGenerate} disabled={generating}>
                <Text style={styles.regenerateButtonText}>{generating ? 'Processing...' : 'Regenerate Vlog'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyFeed}>
              <Text style={styles.emptyText}>No group vlog for today yet.</Text>
              <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} disabled={generating}>
                <Text style={styles.generateButtonText}>{generating ? 'Starting...' : 'Generate Group Vlog'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={renderMember}
          contentContainerStyle={styles.memberList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyFeed: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vlogContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  regenerateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    alignItems: 'center',
  },
  regenerateButtonText: {
    color: '#fff',
  },
  memberList: {
    padding: 20,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCaptured: {
    backgroundColor: '#E1F5FE',
  },
  statusMissing: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
