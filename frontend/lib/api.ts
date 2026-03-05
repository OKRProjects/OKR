const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface Item {
  _id?: string;
  userId?: string;
  title: string;
  description: string;
  imageUrls?: string[];
  videoUrls?: string[];
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

export type DashboardSortField = 'score' | 'owner' | 'updated';
export type SortDirection = 'asc' | 'desc';

export interface ViewPreferences {
  lastDetailTab: string;
  visibleTabs: Record<string, boolean>;
  dashboardSort: DashboardSortField;
  dashboardSortDirection: SortDirection;
  dashboardFilterUpdateType: string;
  historyEventTypeFilter: string;
}

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = {
  lastDetailTab: 'overview',
  visibleTabs: {
    overview: true,
    progress: true,
    updates: true,
    history: true,
    dependencies: true,
    files: true,
  },
  dashboardSort: 'updated',
  dashboardSortDirection: 'desc',
  dashboardFilterUpdateType: 'all',
  historyEventTypeFilter: 'all',
};

export type ObjectiveLevel = 'strategic' | 'functional' | 'tactical';
export type ObjectiveTimeline = 'annual' | 'quarterly';

export type ObjectiveStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export interface Objective {
  _id?: string;
  title: string;
  description?: string;
  ownerId?: string;
  level: ObjectiveLevel;
  timeline: ObjectiveTimeline;
  fiscalYear: number;
  quarter?: string;
  parentObjectiveId?: string | null;
  division?: string;
  departmentId?: string | null;
  status?: ObjectiveStatus;
  relatedObjectiveIds?: string[];
  averageScore?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ObjectiveTree extends Objective {
  children: ObjectiveTree[];
  keyResults: KeyResult[];
  averageScore?: number | null;
}

export interface KeyResult {
  _id?: string;
  objectiveId: string;
  title: string;
  target?: string;
  currentValue?: string;
  unit?: string;
  /** Score 0.0–1.0 (OKR standard) */
  score?: number | null;
  targetScore?: number;
  ownerId?: string | null;
  notes?: Array<{ text?: string; createdAt?: string }>;
  createdAt?: string;
  lastUpdatedAt?: string;
}

export interface WorkflowEvent {
  _id?: string;
  objectiveId: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  reason?: string;
  timestamp: string;
}

export interface ScoreHistoryEntry {
  _id?: string;
  keyResultId: string;
  score: number;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

export interface Comment {
  _id?: string;
  objectiveId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Attachment {
  _id?: string;
  objectiveId: string;
  keyResultId?: string | null;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
  deletedAt?: string | null;
}

async function getAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/token`, {
      credentials: 'include', // Include cookies for session
    });
    if (response.ok) {
      const data = await response.json();
      return data.accessToken || null;
    } else {
      // 401 is expected when not logged in - return null silently
      // Don't log or throw errors for 401
      if (response.status === 401) {
        return null;
      }
      
      // Only log non-401 errors
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      if (response.status === 500) {
        console.error('Token endpoint configuration error:', errorData);
      }
      // Don't log other errors either - just return null
    }
  } catch (error) {
    // Network errors - return null silently
    return null;
  }
  return null;
}

/** Thrown when PUT key-result returns 409 Conflict (stale lastUpdatedAt). */
export class ApiConflictError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: { current?: KeyResult; error?: string; message?: string }
  ) {
    super(message);
    this.name = 'ApiConflictError';
  }
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let token = await getAccessToken();
  
  // If token fetch failed, try once more after a short delay
  if (!token) {
    await new Promise(resolve => setTimeout(resolve, 500));
    token = await getAccessToken();
  }
  
  if (!token) {
    throw new Error('Unable to get access token. Please check your authentication configuration.');
  }
  
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include', // Include cookies
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    const errorMessage = error.message || error.error || `HTTP error! status: ${response.status}`;
    
    throw new Error(errorMessage);
  }

  return response.json();
}

async function fetchPublic(url: string, options: RequestInit = {}) {
  const isFormData = options.body instanceof FormData;
  const headers: HeadersInit = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth API
  async login(): Promise<{ auth_url: string }> {
    return fetchPublic('/api/auth/login');
  },

  async loginEmailPassword(email: string, password: string): Promise<{ user: any; message: string }> {
    return fetchPublic('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  },

  async register(email: string, password: string, name?: string): Promise<{ user: any; message: string }> {
    return fetchPublic('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });
  },

  async logout(): Promise<{ logout_url?: string; message?: string }> {
    return fetchPublic('/api/auth/logout', { method: 'POST' });
  },

  async getCurrentUser(): Promise<any> {
    return fetchWithAuth('/api/auth/me');
  },

  async getItems(): Promise<Item[]> {
    return fetchWithAuth('/api/items');
  },

  async getItem(id: string): Promise<Item> {
    return fetchWithAuth(`/api/items/${id}`);
  },

  async createItem(item: { title: string; description: string; images?: File[]; videos?: File[] }): Promise<Item> {
    const formData = new FormData();
    formData.append('title', item.title);
    formData.append('description', item.description);
    
    if (item.images) {
      item.images.forEach((file) => {
        formData.append('images', file);
      });
    }
    
    if (item.videos) {
      item.videos.forEach((file) => {
        formData.append('videos', file);
      });
    }
    
    return fetchWithAuth('/api/items', {
      method: 'POST',
      body: formData,
    });
  },

  async updateItem(id: string, item: { title?: string; description?: string; images?: File[]; videos?: File[]; imageUrls?: string[]; videoUrls?: string[] }): Promise<Item> {
    const formData = new FormData();
    if (item.title) formData.append('title', item.title);
    if (item.description) formData.append('description', item.description);
    
    if (item.images) {
      item.images.forEach((file) => {
        formData.append('images', file);
      });
    }
    
    if (item.videos) {
      item.videos.forEach((file) => {
        formData.append('videos', file);
      });
    }
    
    // If no files but URLs provided, use JSON
    if (!item.images?.length && !item.videos?.length && (item.imageUrls || item.videoUrls)) {
      return fetchWithAuth(`/api/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          imageUrls: item.imageUrls,
          videoUrls: item.videoUrls,
        }),
      });
    }
    
    return fetchWithAuth(`/api/items/${id}`, {
      method: 'PUT',
      body: formData,
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

  /** View preferences (tabs, sort, filter). Saved to user profile. */
  async getViewPreferences(): Promise<ViewPreferences> {
    return fetchWithAuth('/api/profiles/preferences');
  },

  async updateViewPreferences(prefs: Partial<ViewPreferences>): Promise<ViewPreferences> {
    return fetchWithAuth('/api/profiles/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  async resetViewPreferences(): Promise<ViewPreferences> {
    return fetchWithAuth('/api/profiles/preferences', { method: 'DELETE' });
  },

  // Chat API (public endpoint, no auth required)
  async sendChatMessage(messages: Array<{ role: string; content: string }>, model?: string): Promise<{ message: string; usage?: any }> {
    return fetchPublic('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, model: model || 'openai/gpt-3.5-turbo' }),
    });
  },

  // OKRs API
  async getObjectives(params?: { fiscalYear?: number; level?: string; division?: string; status?: string; ownerId?: string; parentObjectiveId?: string | null }): Promise<Objective[]> {
    const search = new URLSearchParams();
    if (params?.fiscalYear != null) search.set('fiscalYear', String(params.fiscalYear));
    if (params?.level) search.set('level', params.level);
    if (params?.division) search.set('division', params.division);
    if (params?.status) search.set('status', params.status);
    if (params?.ownerId) search.set('ownerId', params.ownerId);
    if (params?.parentObjectiveId !== undefined) search.set('parentObjectiveId', params.parentObjectiveId ?? '');
    const q = search.toString();
    return fetchWithAuth(`/api/objectives${q ? `?${q}` : ''}`);
  },

  async getObjective(id: string, params?: { since?: string }): Promise<Objective | { unchanged: true }> {
    const url = params?.since
      ? `/api/objectives/${id}?since=${encodeURIComponent(params.since)}`
      : `/api/objectives/${id}`;
    const data = await fetchWithAuth(url);
    if (data && typeof data === 'object' && 'unchanged' in data && data.unchanged === true) {
      return { unchanged: true };
    }
    return data as Objective;
  },

  async postView(objectiveId: string, body?: { userName?: string }): Promise<{ viewers: { userId: string; userName: string }[]; count: number }> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/view`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },

  async leaveView(objectiveId: string): Promise<void> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/leave`, { method: 'POST' });
  },

  async getObjectiveTree(id: string): Promise<ObjectiveTree> {
    return fetchWithAuth(`/api/objectives/${id}/tree`);
  },

  async createObjective(obj: Partial<Objective> & { title: string; fiscalYear: number }): Promise<Objective> {
    return fetchWithAuth('/api/objectives', {
      method: 'POST',
      body: JSON.stringify(obj),
    });
  },

  async updateObjective(id: string, obj: Partial<Objective>): Promise<Objective> {
    return fetchWithAuth(`/api/objectives/${id}`, {
      method: 'PUT',
      body: JSON.stringify(obj),
    });
  },

  async deleteObjective(id: string): Promise<void> {
    return fetchWithAuth(`/api/objectives/${id}`, { method: 'DELETE' });
  },

  async getKeyResults(objectiveId: string): Promise<KeyResult[]> {
    return fetchWithAuth(`/api/key-results?objectiveId=${encodeURIComponent(objectiveId)}`);
  },

  async getKeyResult(id: string): Promise<KeyResult> {
    return fetchWithAuth(`/api/key-results/${id}`);
  },

  async createKeyResult(kr: { objectiveId: string; title: string; target?: string; currentValue?: string; unit?: string }): Promise<KeyResult> {
    return fetchWithAuth('/api/key-results', {
      method: 'POST',
      body: JSON.stringify(kr),
    });
  },

  async updateKeyResult(id: string, kr: Partial<KeyResult>): Promise<KeyResult> {
    const token = await getAccessToken();
    if (!token) throw new Error('Unable to get access token.');
    const response = await fetch(`${API_URL}/api/key-results/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(kr),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 409) {
      throw new ApiConflictError(
        data.message || 'Conflict',
        409,
        data as { current?: KeyResult; error?: string; message?: string }
      );
    }
    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }
    return data as KeyResult;
  },

  async deleteKeyResult(id: string): Promise<void> {
    return fetchWithAuth(`/api/key-results/${id}`, { method: 'DELETE' });
  },

  async getKeyResultHistory(keyResultId: string): Promise<ScoreHistoryEntry[]> {
    return fetchWithAuth(`/api/key-results/${keyResultId}/history`);
  },

  async getWorkflowHistory(objectiveId: string): Promise<WorkflowEvent[]> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/workflow-history`);
  },

  async getDependencies(objectiveId: string): Promise<{ upstream: Objective[]; downstream: Objective[] }> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/dependencies`);
  },

  async submitObjective(objectiveId: string): Promise<Objective> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/submit`, { method: 'POST' });
  },

  async approveObjective(objectiveId: string): Promise<Objective> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/approve`, { method: 'POST' });
  },

  async rejectObjective(objectiveId: string, reason?: string): Promise<Objective> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? '' }),
    });
  },

  async resubmitObjective(objectiveId: string): Promise<Objective> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/resubmit`, { method: 'POST' });
  },

  async getComments(objectiveId: string): Promise<Comment[]> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/comments`);
  },

  async createComment(objectiveId: string, body: string): Promise<Comment> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  },

  async getAttachments(objectiveId: string): Promise<Attachment[]> {
    return fetchWithAuth(`/api/objectives/${objectiveId}/attachments`);
  },

  async createAttachment(form: {
    objectiveId: string;
    keyResultId?: string | null;
    file?: File;
    url?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  }): Promise<Attachment> {
    if (form.file) {
      const fd = new FormData();
      fd.append('objectiveId', form.objectiveId);
      if (form.keyResultId) fd.append('keyResultId', form.keyResultId);
      fd.append('file', form.file);
      return fetchWithAuth('/api/attachments', { method: 'POST', body: fd });
    }
    return fetchWithAuth('/api/attachments', {
      method: 'POST',
      body: JSON.stringify({
        objectiveId: form.objectiveId,
        keyResultId: form.keyResultId ?? undefined,
        url: form.url,
        fileName: form.fileName,
        fileSize: form.fileSize,
        fileType: form.fileType,
      }),
    });
  },

  async deleteAttachment(attachmentId: string): Promise<void> {
    return fetchWithAuth(`/api/attachments/${attachmentId}`, { method: 'DELETE' });
  },
};
