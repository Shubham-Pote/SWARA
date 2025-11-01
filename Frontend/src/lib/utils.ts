import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind utility function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API Constants
export const API_CONFIG = {
  BASE_URL: 'https://ai-summit-fic4.vercel.app/api',
  STORAGE_KEYS: {
    TOKEN: 'token',
  },
  HEADERS: {
    CONTENT_TYPE: 'application/json',
  },
} as const;

// Storage utilities
export const storage = {
  setToken: (token: string): void => {
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.TOKEN, token);
  },

  getToken: (): string | null => {
    return localStorage.getItem(API_CONFIG.STORAGE_KEYS.TOKEN);
  },

  removeToken: (): void => {
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.TOKEN);
  },
};

// API utilities
export const createHeaders = (includeAuth = false): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
  };

  if (includeAuth) {
    const token = storage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

export const createApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const buildQueryParams = (params: Record<string, string | undefined>): string => {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });

  return queryParams.toString();
};

// Transform lesson data for frontend compatibility
export const transformLessonData = (lesson: any) => ({
  ...lesson,
  id: lesson._id,
  duration: `${lesson.estimatedMinutes} min`,
  progress: lesson.progress || 0,
  completed: lesson.completed || false,
  locked: lesson.locked || false,
});
