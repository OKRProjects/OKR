const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface Item {
  _id?: string;
  userId?: string;
  title: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Profile {
  _id?: string;
  userId?: string;
  displayName: string;
  bio: string;
  profileImageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/token');
    if (response.ok) {
      const data = await response.json();
      return data.accessToken || null;
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Error getting access token:', response.status, errorData);
    }
  } catch (error) {
    console.error('Error getting access token:', error);
  }
  return null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  async getItems(): Promise<Item[]> {
    return fetchWithAuth('/api/items');
  },

  async getItem(id: string): Promise<Item> {
    return fetchWithAuth(`/api/items/${id}`);
  },

  async createItem(item: Omit<Item, '_id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Item> {
    return fetchWithAuth('/api/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateItem(id: string, item: Partial<Item>): Promise<Item> {
    return fetchWithAuth(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  async deleteItem(id: string): Promise<void> {
    return fetchWithAuth(`/api/items/${id}`, {
      method: 'DELETE',
    });
  },

  // Profile API
  async getProfile(): Promise<Profile> {
    return fetchWithAuth('/api/profiles');
  },

  async createProfile(profile: { displayName: string; bio: string; image?: File }): Promise<Profile> {
    const formData = new FormData();
    formData.append('displayName', profile.displayName);
    formData.append('bio', profile.bio);
    if (profile.image) {
      formData.append('image', profile.image);
    }
    return fetchWithAuth('/api/profiles', {
      method: 'POST',
      body: formData,
    });
  },

  async updateProfile(profile: { displayName?: string; bio?: string; image?: File }): Promise<Profile> {
    const formData = new FormData();
    if (profile.displayName) formData.append('displayName', profile.displayName);
    if (profile.bio !== undefined) formData.append('bio', profile.bio);
    if (profile.image) {
      formData.append('image', profile.image);
    }
    return fetchWithAuth('/api/profiles', {
      method: 'PUT',
      body: formData,
    });
  },

  async uploadImage(image: File): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', image);
    return fetchWithAuth('/api/profiles/image', {
      method: 'POST',
      body: formData,
    });
  },
};
