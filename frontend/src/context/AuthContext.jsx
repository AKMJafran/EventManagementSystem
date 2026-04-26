import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';
import { jwtDecode } from 'jwt-decode';

const useAuthStore = create((set) => ({

  user: null,
  accessToken: null,
  isAuthenticated: false,
  authLoaded: false,
  
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { accessToken, refreshToken, role, mustChangePassword } = response.data;
      
      const decodedToken = jwtDecode(accessToken);
      const user = {
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        role: role,
        profilePictureUrl: decodedToken.profilePictureUrl,
        mustChangePassword: !!mustChangePassword,
      };

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, accessToken, isAuthenticated: true });
      return { role, mustChangePassword: !!mustChangePassword };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  markPasswordChanged: () => {
    set((state) => {
      const updatedUser = { ...state.user, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },

  skipPasswordChange: () => {
    set((state) => {
      const updatedUser = { ...state.user, mustChangePassword: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
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
        set({ user: null, accessToken: null, isAuthenticated: false, authLoaded: true });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } else {
        // Also update user state from potentially refreshed token properties in localStorage
        set({ user: { ...user, profilePictureUrl: decodedToken.profilePictureUrl, name: decodedToken.name }, accessToken, isAuthenticated: true, authLoaded: true });
      }
    } else {
      set({ authLoaded: true });
    }
  },
}));

export default useAuthStore;
