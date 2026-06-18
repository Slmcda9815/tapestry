
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';

export default function CreateGroupScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const navigation = useNavigation<any>();

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/groups', { name });
      const data = await response.json();

      if (response.ok) {
        setGroup(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Create group error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!group) return;
    try {
      await Share.share({
        message: `Join my Tapestry group "${group.name}" with code: ${group.invite_code}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Group</Text>
        <View style={{ width: 40 }} />
      </View>

      {!group ? (
        <View style={styles.form}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Besties"
            value={name}
            onChangeText={setName}
          />
          
          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.success}>
          <Text style={styles.successTitle}>Group Created!</Text>
          <Text style={styles.groupName}>{group.name}</Text>
          
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Invite Code</Text>
            <Text style={styles.code}>{group.invite_code}</Text>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share Invite Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.navigate('GroupList')}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 40,
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  success: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CD964',
    marginBottom: 10,
  },
  groupName: {
    fontSize: 20,
    marginBottom: 40,
  },
  codeContainer: {
    backgroundColor: '#f9f9f9',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  code: {
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 5,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    padding: 18,
    width: '100%',
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
});
