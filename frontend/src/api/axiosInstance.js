import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track whether a refresh is in progress to avoid multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

// Helper function to process queued requests after token refresh
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

/**
 * REQUEST INTERCEPTOR
 * Adds Authorization header with Bearer token to every request
 */
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handles 401 responses by refreshing token and retrying request
 */
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const originalRequest = error.config;

    // Check if error is 401 (Unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Mark request to avoid infinite loop
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Start refresh process
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token available - clear storage and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      return new Promise((resolve, reject) => {
        axios
          .post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken })
          .then((response) => {
            const { accessToken, refreshToken: newRefreshToken } = response.data;

            // Update tokens in localStorage
            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            // Update authorization header
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            // Process queued requests with new token
            processQueue(null, accessToken);

            // Retry original request
            resolve(axiosInstance(originalRequest));
          })
          .catch((refreshError) => {
            // Token refresh failed
            console.error('Token refresh failed:', refreshError);

            // Clear all stored data
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Process queued requests with error
            processQueue(refreshError, null);

            // Redirect to login
            window.location.href = '/login';

            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
