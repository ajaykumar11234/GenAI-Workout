/**
 * Node.js Backend API Service
 * Handles all communication with the Express server
 */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Generic fetch wrapper with error handling and auth
 */
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem('accessToken');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    credentials: 'include', // Include cookies
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Please check your connection.');
    }
    throw error;
  }
};

/**
 * Main API object with all endpoints
 */
export const api = {
  // ============ AUTH ENDPOINTS ============
  auth: {
    register: async (userData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/register`, {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },

    login: async (credentials) => {
      const response = await fetchWithAuth(`${API_URL}/api/v1/user/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
      }
      return response;
    },

    logout: async () => {
      const response = await fetchWithAuth(`${API_URL}/api/v1/user/logout`, {
        method: 'POST',
      });
      localStorage.removeItem('accessToken');
      return response;
    },

    getCurrentUser: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/current-user`);
    },

    changePassword: async (passwords) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/change-password`, {
        method: 'POST',
        body: JSON.stringify(passwords),
      });
    },
  },

  // ============ USER ENDPOINTS ============
  user: {
    getProfile: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/current-user`);
    },

    updateProfile: async (userData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/update-account`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });
    },
  },

  // ============ WORKOUT ENDPOINTS ============
  workout: {
    getWorkoutPlan: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/workout-plan`);
    },

    createWorkoutPlan: async (workoutData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/create-workout`, {
        method: 'POST',
        body: JSON.stringify(workoutData),
      });
    },

    updateWorkoutPlan: async (planId, workoutData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/workout-plan/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify(workoutData),
      });
    },

    deleteWorkoutPlan: async (planId) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/workout-plan/${planId}`, {
        method: 'DELETE',
      });
    },
  },

  // ============ DIET ENDPOINTS ============
  diet: {
    getDietPlan: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/diet-plan`);
    },

    createDietPlan: async (dietData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/create-diet`, {
        method: 'POST',
        body: JSON.stringify(dietData),
      });
    },
  },

  // ============ EXERCISE ENDPOINTS ============
  exercise: {
    getAllExercises: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/exercises`);
    },

    getExerciseById: async (exerciseId) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/exercise/${exerciseId}`);
    },
  },

  // ============ PERFORMANCE ENDPOINTS ============
  performance: {
    getPerformance: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/performance`);
    },

    recordPerformance: async (performanceData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/performance`, {
        method: 'POST',
        body: JSON.stringify(performanceData),
      });
    },
  },

  // ============ WEIGHT LOG ENDPOINTS ============
  weightLog: {
    getWeightLogs: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/weight-logs`);
    },

    addWeightLog: async (weightData) => {
      return fetchWithAuth(`${API_URL}/api/v1/user/weight-log`, {
        method: 'POST',
        body: JSON.stringify(weightData),
      });
    },
  },

  // ============ DAILY STATS ENDPOINTS ============
  dailyStats: {
    getStats: async () => {
      return fetchWithAuth(`${API_URL}/api/v1/user/daily-stats`);
    },
  },

  // ============ HEALTH CHECK ============
  health: async () => {
    return fetch(`${API_URL}/health`).then(res => res.json());
  },
};

// Legacy export for backward compatibility
export async function fetchExercises() {
  return api.exercise.getAllExercises();
}

export default api;
