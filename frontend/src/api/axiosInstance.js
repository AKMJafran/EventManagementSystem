import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
const DEFAULT_TIMEOUT_MS = 10000;
const FILE_UPLOAD_TIMEOUT_MS = 30000;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

let isRefreshing = false;
let failedQueue = [];

const clearStoredAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

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

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      config.headers = config.headers || {};
      config.headers['Content-Type'] = undefined;
      config.headers['content-type'] = undefined;
      if (config.timeout == null || config.timeout === DEFAULT_TIMEOUT_MS) {
        config.timeout = FILE_UPLOAD_TIMEOUT_MS;
      }

      if (config.headers.common) {
        config.headers.common['Content-Type'] = undefined;
        config.headers.common['content-type'] = undefined;
      }

      if (config.headers.post) {
        config.headers.post['Content-Type'] = undefined;
        config.headers.post['content-type'] = undefined;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        clearStoredAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      return new Promise((resolve, reject) => {
        axios
          .post(`${API_BASE_URL}/auth/refresh-token`, null, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          })
          .then((response) => {
            const { accessToken, refreshToken: newRefreshToken, role, email, mustChangePassword } = response.data;
            const decodedToken = jwtDecode(accessToken);

            localStorage.setItem('accessToken', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
            }

            const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
            if (storedUser) {
              localStorage.setItem(
                'user',
                JSON.stringify({
                  ...storedUser,
                  name: decodedToken.name,
                  email: email || decodedToken.sub,
                  role: role || storedUser.role,
                  profilePictureUrl: decodedToken.profilePictureUrl,
                  mustChangePassword: Boolean(mustChangePassword),
                })
              );
            }

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            processQueue(null, accessToken);
            resolve(axiosInstance(originalRequest));
          })
          .catch((refreshError) => {
            clearStoredAuth();
            processQueue(refreshError, null);
            window.location.href = '/login';
            reject(refreshError);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    if (error.response?.status === 403 && !originalRequest?._retry) {
      clearStoredAuth();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
