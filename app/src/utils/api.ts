
import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'http://localhost:3000/api';

async function getAuthHeaders() {
  const token = await SecureStore.getItemAsync('userToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export const api = {
  async post(endpoint: string, body: any) {
    const headers = endpoint.includes('/auth/') 
      ? { 'Content-Type': 'application/json' }
      : await getAuthHeaders();
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return response;
  },

  async get(endpoint: string) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers,
    });
    return response;
  },

  async uploadClip(clipId: string, uri: string) {
    const token = await SecureStore.getItemAsync('userToken');
    const formData = new FormData();
    // @ts-ignore
    formData.append('video', {
      uri,
      name: 'video.mp4',
      type: 'video/mp4',
    });

    const response = await fetch(`${BASE_URL}/clips/${clipId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    return response;
  }
};
