/**
 * Flask Backend API Service
 * Handles all communication with the Flask server for exercise tracking
 */

const FLASK_API_URL = import.meta.env.VITE_FLASK_URL || "http://localhost:5000";

/**
 * Generic fetch wrapper with error handling
 */
const fetchWithErrorHandling = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to Flask server. Make sure it is running on port 5000.');
    }
    throw error;
  }
};

/**
 * Exercise API
 */
export const flaskAPI = {
  /**
   * Start an exercise session
   * @param {string} exerciseId - Exercise type (bicep_curl, squat, pushup)
   * @returns {Promise<Object>} Response with message
   */
  startExercise: async (exerciseId) => {
    return fetchWithErrorHandling(`${FLASK_API_URL}/start/${exerciseId}`, {
      method: 'POST',
    });
  },

  /**
   * Stop the current exercise session
   * @returns {Promise<Object>} Response with workout summary
   */
  stopExercise: async () => {
    // Get access token to pass to Flask for backend saving
    const accessToken = localStorage.getItem('accessToken');
    
    return fetchWithErrorHandling(`${FLASK_API_URL}/stop`, {
      method: 'POST',
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
      },
    });
  },

  /**
   * Reset the exercise state
   * @returns {Promise<Object>} Response with message
   */
  resetExercise: async () => {
    return fetchWithErrorHandling(`${FLASK_API_URL}/reset`, {
      method: 'POST',
    });
  },

  /**
   * Get current exercise status
   * @returns {Promise<Object>} Current status including reps, calories, feedback
   */
  getStatus: async () => {
    return fetchWithErrorHandling(`${FLASK_API_URL}/status`);
  },

  /**
   * Get video feed URL
   * @returns {string} Video feed URL
   */
  getVideoFeedUrl: () => {
    return `${FLASK_API_URL}/video_feed`;
  },

  /**
   * Get random motivation message
   * @returns {Promise<Object>} Motivation message and type
   */
  getMotivation: async () => {
    return fetchWithErrorHandling(`${FLASK_API_URL}/motivation`, {
      method: 'POST',
    });
  },

  /**
   * Check if Flask server is running
   * @returns {Promise<boolean>} True if server is reachable
   */
  checkServerHealth: async () => {
    try {
      const response = await fetch(`${FLASK_API_URL}/status`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

/**
 * Exercise Types
 */
export const EXERCISE_TYPES = {
  BICEP_CURL: 'bicep_curl',
  SQUAT: 'squat',
  PUSHUP: 'pushup',
};

/**
 * Exercise Configuration
 */
export const EXERCISES = [
  {
    id: EXERCISE_TYPES.BICEP_CURL,
    name: 'Bicep Curl',
    icon: '💪',
    color: 'from-blue-500 to-purple-600',
    description: 'Build arm strength with controlled bicep curls',
    targetMuscles: ['Biceps', 'Forearms'],
    difficulty: 'Beginner',
  },
  {
    id: EXERCISE_TYPES.SQUAT,
    name: 'Squat',
    icon: '🦵',
    color: 'from-green-500 to-teal-600',
    description: 'Full body lower workout focusing on legs and glutes',
    targetMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'],
    difficulty: 'Intermediate',
  },
  {
    id: EXERCISE_TYPES.PUSHUP,
    name: 'Push-up',
    icon: '🤲',
    color: 'from-red-500 to-pink-600',
    description: 'Classic upper body exercise for chest and arms',
    targetMuscles: ['Chest', 'Triceps', 'Shoulders'],
    difficulty: 'Beginner',
  },
];

/**
 * Status polling hook utility
 * Use this in React components to poll status
 */
export const useStatusPolling = (isRunning, interval = 500) => {
  const [status, setStatus] = React.useState({});
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!isRunning) return;

    const pollStatus = async () => {
      try {
        const data = await flaskAPI.getStatus();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    const intervalId = setInterval(pollStatus, interval);
    pollStatus(); // Initial call

    return () => clearInterval(intervalId);
  }, [isRunning, interval]);

  return { status, error };
};

export default flaskAPI;
