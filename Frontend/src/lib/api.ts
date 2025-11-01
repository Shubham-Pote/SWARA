// Determine API base URL based on environment
const getApiBaseUrl = () => {
  // In production, use the environment variable or deployed backend
  if (import.meta.env.PROD && import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}/api`;
  }
  // In development, use proxy
  if (import.meta.env.DEV) {
    return '/api';
  }
  // Fallback to production backend
  return 'https://swara-lemon.vercel.app/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API_BASE_URL:', API_BASE_URL);
console.log('🔧 Environment:', import.meta.env.MODE);
console.log('🔧 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

// Token management functions
export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

// Profile API functions
export const profileAPI = {
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return await response.json();
  },

  updateProfile: async (data: { displayName: string; bio: string; location: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return await response.json();
  },
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// Get auth headers for API requests
export const getAuthHeaders = () => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
  console.log('Auth headers:', headers, 'Token exists:', !!token);
  return headers;
};

// Auth API functions
export const authAPI = {
  // Register new user - SIMPLIFIED (no username required)
  register: async (userData: {
    email: string;
    password: string;
    displayName: string;
  }) => {
    console.log('📝 Attempting registration to:', `${API_BASE_URL}/auth/register`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('📡 Register response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      console.log('✅ Registration response received');
      return data;
    } catch (error: any) {
      console.error('❌ Registration fetch error:', error);
      throw new Error(error.message || 'Failed to connect to server');
    }
  },

  // Login user
  login: async (credentials: {
    email: string;
    password: string;
  }) => {
    console.log('🔐 Attempting login to:', `${API_BASE_URL}/auth/login`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      console.log('📡 Login response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      console.log('✅ Login response received');
      return data;
    } catch (error: any) {
      console.error('❌ Login fetch error:', error);
      throw new Error(error.message || 'Failed to connect to server');
    }
  },

  // Get user profile
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return await response.json();
  },

  // ✅ ADDED: Update user profile (MISSING FUNCTION)
  updateProfile: async (profileData: {
    displayName: string;
    bio: string;
    location: string;
  }) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return await response.json();
  },

  // Switch language
  switchLanguage: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/language`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      throw new Error('Failed to switch language');
    }

    return await response.json();
  },

  // Get language stats
  getLanguageStats: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/language-stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch language stats');
    }

    return await response.json();
  },
};

// Lessons API functions
export const lessonsAPI = {
  // Get lessons by language
  getLessonsByLanguage: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/lessons/${language}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch lessons');
    }
    
    const data = await response.json();
    
    // Transform _id to id for frontend compatibility
    const transformedLessons = data.lessons?.map((lesson: any) => ({
      ...lesson,
      id: lesson._id,
      duration: `${lesson.estimatedMinutes} min`,
      // Add mock progress data if not present
      progress: lesson.progress || 0,
      completed: lesson.completed || false,
      locked: lesson.locked || false,
    })) || [];
    
    return { lessons: transformedLessons };
  },

  // Get lesson details
  getLessonDetails: async (lessonId: string) => {
    const response = await fetch(`${API_BASE_URL}/lessons/lesson/${lessonId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch lesson details');
    }
    
    const data = await response.json();
    
    // Transform the response to match frontend expectations
    const transformedLesson = {
      ...data.lesson,
      id: data.lesson._id,
      totalSteps: data.lesson.steps?.length || 0,
      currentProgress: data.lesson.currentProgress || 0,
      progress: data.lesson.progress || 0,
    };
    
    return { lesson: transformedLesson };
  },

  // Update lesson progress
  updateProgress: async (lessonId: string, progressData: {
    currentStep: number;
    totalSteps: number;
    completed: boolean;
    timeSpent: number;
    language: string;
    score: number;
  }) => {
    const response = await fetch(`${API_BASE_URL}/lessons/${lessonId}/progress`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(progressData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update progress');
    }
    
    return await response.json();
  },

  // Get dashboard data
  getDashboard: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/lessons/${language}/dashboard`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard');
    }
    
    return await response.json();
  },

  // Generate new lesson
  generateLesson: async (lessonData: {
    language: string;
    topic: string;
    difficulty: string;
    lessonType: string;
    generateAudio?: boolean;
  }) => {
    const response = await fetch(`${API_BASE_URL}/lessons/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(lessonData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate lesson');
    }
    
    return await response.json();
  },
};

// Notes API functions
export const notesAPI = {
  // Get all notes
  getNotes: async (params: {
    language?: string;
    section?: string;
    topic?: string;
    search?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const url = `${API_BASE_URL}/notes?${queryParams}`;
    console.log('API: Fetching notes from:', url); // Debug log
    console.log('API: With params:', params); // Debug log

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    console.log('API: Get notes response status:', response.status, response.statusText); // Debug log
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API: Get notes error:', errorData); // Debug log
      throw new Error(errorData.message || `Failed to fetch notes: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('API: Get notes success:', responseData); // Debug log
    return responseData;
  },

  // Create note
  createNote: async (noteData: {
    title: string;
    content: string;
    language: string;
    topic?: string;
    tags?: string[];
  }) => {
    console.log('API: Creating note with data:', noteData); // Debug log
    console.log('API: Using URL:', `${API_BASE_URL}/notes`); // Debug log
    console.log('API: Using headers:', getAuthHeaders()); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    
    console.log('API: Response status:', response.status, response.statusText); // Debug log
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API: Error response:', errorData); // Debug log
      throw new Error(errorData.message || `Failed to create note: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log('API: Success response:', responseData); // Debug log
    return responseData;
  },

  // Generate AI notes
  generateNotes: async (data: { lessonId: string; language: string }) => {
    const response = await fetch(`${API_BASE_URL}/notes/generate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate notes');
    }
    
    return await response.json();
  },

  // Get notes stats
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/notes/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }
    
    return await response.json();
  },

  // Toggle star
  toggleStar: async (noteId: string) => {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}/star`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle star');
    }
    
    return await response.json();
  },

  // Update note
  updateNote: async (noteId: string, noteData: {
    title?: string;
    content?: string;
    topic?: string;
    tags?: string[];
  }) => {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update note');
    }
    
    return await response.json();
  },

  // Delete note
  deleteNote: async (noteId: string) => {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete note');
    }
    
    return await response.json();
  },
};

// Reading API functions
export const readingAPI = {
  // Get current article for user
  getCurrentArticle: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/reading/current/${language}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get current article');
    }
    
    return await response.json();
  },

  // Get all user articles (completed + current)
  getUserArticles: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/reading/articles/${language}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get user articles');
    }
    
    return await response.json();
  },

  // Get article by ID (for review)
  getArticleById: async (articleId: string) => {
    const response = await fetch(`${API_BASE_URL}/reading/article/${articleId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get article');
    }
    
    return await response.json();
  },

  // Start reading an article
  startReading: async (articleId: string) => {
    const response = await fetch(`${API_BASE_URL}/reading/start/${articleId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start reading');
    }
    
    return await response.json();
  },

  // Complete article and submit quiz
  completeArticle: async (articleId: string, data: { answers: number[]; timeSpent: number }) => {
    const response = await fetch(`${API_BASE_URL}/reading/complete/${articleId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete article');
    }
    
    return await response.json();
  },

  // Generate next article
  generateNextArticle: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/reading/next/${language}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate next article');
    }
    
    return await response.json();
  },

  // Get reading statistics
  getReadingStats: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/reading/stats/${language}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to get reading stats');
    }
    
    return await response.json();
  },
};

// Character API functions
export const characterAPI = {
  // Start a new conversation with a character
  startConversation: async (characterId: string) => {
    console.log('API: Starting conversation', { characterId, API_BASE_URL });
    
    const response = await fetch(`${API_BASE_URL}/character/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        characterId,
        language: characterId === 'akira' ? 'ja' : 'es',
        personality: 'friendly'
      }),
    });

    console.log('API: Start conversation response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API: Start conversation error:', errorData);
      throw new Error(errorData.message || 'Failed to start conversation');
    }

    const data = await response.json();
    console.log('API: Start conversation success:', data);
    
    return {
      conversation: data.data.session,
      initialMessage: null // Backend doesn't provide initial message
    };
  },

  // Send a message to character
  sendMessage: async (sessionId: string, content: string) => {
    console.log('API: Sending message to backend', { sessionId, content, API_BASE_URL });
    
    const response = await fetch(`${API_BASE_URL}/character/message`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        sessionId, 
        message: content 
      }),
    });

    console.log('API: Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API: Error response:', errorData);
      throw new Error(errorData.message || 'Failed to send message');
    }

    const data = await response.json();
    console.log('API: Success response:', data);
    
    // Transform backend response to match frontend expectations
    return {
      userMessage: {
        _id: data.data.userMessage._id,
        conversationId: sessionId,
        sender: 'user' as const,
        content: data.data.userMessage.message,
        createdAt: data.data.userMessage.timestamp
      },
      characterMessage: {
        _id: data.data.characterResponse._id,
        conversationId: sessionId,
        sender: 'character' as const,
        content: data.data.characterResponse.message,
        createdAt: data.data.characterResponse.timestamp
      }
    };
  },

  // Send voice message to character (for now, convert to text)
  sendVoiceMessage: async (sessionId: string, audioFile: File) => {
    // For now, we'll just send a placeholder text message
    // In a real implementation, you'd convert speech to text first
    console.log('Audio file received:', audioFile.name, audioFile.size);
    const placeholderText = "Voice message received";
    return await characterAPI.sendMessage(sessionId, placeholderText);
  },

  // End conversation
  endConversation: async (sessionId: string) => {
    const response = await fetch(`${API_BASE_URL}/character/end/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to end conversation');
    }

    return await response.json();
  },

  // Get conversation history
  getHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/character/history`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch history');
    }

    return await response.json();
  },

  // Clear conversation history
  clearHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/character/history`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to clear history');
    }

    return await response.json();
  },

  // Get character by ID
  getCharacterById: async (characterId: string) => {
    // This is a mock since backend doesn't have character details endpoint
    const characters = {
      'maria': {
        _id: 'maria',
        id: 'maria',
        name: 'María González',
        age: 28,
        occupation: 'Spanish Teacher',
        location: 'Madrid, Spain',
        nationality: 'Spanish',
        language: 'spanish' as const,
        personality: ['friendly', 'patient', 'encouraging'],
        conversationStyle: 'friendly' as const,
        backstory: 'A passionate Spanish teacher who loves helping students learn about Spanish culture and language.',
        interests: ['culture', 'travel', 'food'],
        specialties: ['grammar', 'conversation', 'cultural context'],
        difficultyLevel: 'intermediate' as const,
        teachingStyle: 'Interactive and supportive',
        vocabularyFocus: ['daily life', 'travel', 'culture'],
        avatar: '/models/maria/avatar.jpg',
        voiceSettings: {
          openaiVoice: 'nova' as const,
          defaultSpeed: 1.0,
          emotionMapping: {
            happy: 1.2,
            sad: 0.8,
            excited: 1.3,
            neutral: 1.0,
          },
        },
        isLocked: false,
        unlockRequirement: {
          type: 'level' as const,
          value: 1,
        },
        isActive: true
      },
      'akira': {
        _id: 'akira',
        id: 'akira',
        name: 'Akira Tanaka',
        age: 32,
        occupation: 'Japanese Tutor',
        location: 'Tokyo, Japan',
        nationality: 'Japanese',
        language: 'japanese' as const,
        personality: ['calm', 'methodical', 'wise'],
        conversationStyle: 'formal' as const,
        backstory: 'A patient Japanese tutor who specializes in making complex concepts easy to understand.',
        interests: ['technology', 'meditation', 'art'],
        specialties: ['grammar', 'writing systems', 'cultural etiquette'],
        difficultyLevel: 'advanced' as const,
        teachingStyle: 'Structured and detailed',
        vocabularyFocus: ['business', 'technology', 'culture'],
        avatar: '/models/akira/avatar.jpg',
        voiceSettings: {
          openaiVoice: 'onyx' as const,
          defaultSpeed: 0.9,
          emotionMapping: {
            happy: 1.1,
            sad: 0.8,
            excited: 1.2,
            neutral: 1.0,
          },
        },
        isLocked: false,
        unlockRequirement: {
          type: 'level' as const,
          value: 1,
        },
        isActive: true
      }
    };

    const character = characters[characterId as keyof typeof characters];
    if (!character) {
      throw new Error('Character not found');
    }

    return { character };
  },
};

// VRM API functions
export const vrmAPI = {
  // Send gesture command to VRM model
  sendGesture: async (gesture: string) => {
    const response = await fetch(`${API_BASE_URL}/vrm/gesture`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ gesture }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to send gesture');
    }

    return await response.json();
  },
};

// Settings API functions
export const settingsAPI = {
  // Switch language setting
  switchLanguage: async (language: string) => {
    const response = await fetch(`${API_BASE_URL}/settings/language`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ language }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to switch language');
    }

    return await response.json();
  },

  // Get current session
  getSession: async () => {
    const response = await fetch(`${API_BASE_URL}/settings/session`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to get session');
    }

    return await response.json();
  },
};
