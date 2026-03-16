import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';
import { jwtDecode } from 'jwt-decode';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { accessToken, refreshToken, role } = response.data;
      
      const decodedToken = jwtDecode(accessToken);
      const user = {
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        role: role,
      };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, accessToken, isAuthenticated: true });
      return { role };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user'));

    if (accessToken && user) {
      const decodedToken = jwtDecode(accessToken);
      const isTokenExpired = decodedToken.exp * 1000 < Date.now();

      if (isTokenExpired) {
        set({ user: null, accessToken: null, isAuthenticated: false });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } else {
        set({ user, accessToken, isAuthenticated: true });
      }
    }
  },
}));

export default useAuthStore;
