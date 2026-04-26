import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance';
import { jwtDecode } from 'jwt-decode';

const normalizeUserId = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
        id: normalizeUserId(decodedToken.userId),
        name: decodedToken.name,
        email: response.data.email || decodedToken.sub,
        role: role,
        profilePictureUrl: decodedToken.profilePictureUrl,
        department: decodedToken.department || null,
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

  updateUserProfile: (updates) => {
    set((state) => {
      if (!state.user) {
        return {};
      }

      const updatedUser = { ...state.user, ...updates };
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
        set({
          user: {
            ...user,
            id: normalizeUserId(decodedToken.userId ?? user.id),
            profilePictureUrl: user.profilePictureUrl ?? decodedToken.profilePictureUrl,
            name: user.name || decodedToken.name,
          },
          accessToken,
          isAuthenticated: true,
          authLoaded: true,
        });
      }
    } else {
      set({ authLoaded: true });
    }
  },
}));

export default useAuthStore;
