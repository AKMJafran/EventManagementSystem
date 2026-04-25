import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../api/axiosInstance';

const clearStoredAuth = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

const persistAuth = ({ accessToken, refreshToken, role, email, mustChangePassword }) => {
  const decodedToken = jwtDecode(accessToken);
  const user = {
    id: decodedToken.sub,
    name: decodedToken.name,
    email: email || decodedToken.sub,
    role,
    profilePictureUrl: decodedToken.profilePictureUrl,
    mustChangePassword: Boolean(mustChangePassword),
  };

  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));

  return { user, accessToken };
};

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  authLoaded: false,

  login: async (email, password) => {
    const response = await axiosInstance.post('/auth/login', { email, password });
    const { accessToken, refreshToken, role, mustChangePassword } = response.data;
    const persisted = persistAuth({
      accessToken,
      refreshToken,
      role,
      email: response.data.email,
      mustChangePassword,
    });

    set({
      user: persisted.user,
      accessToken: persisted.accessToken,
      isAuthenticated: true,
      authLoaded: true,
    });

    return { role, mustChangePassword: Boolean(mustChangePassword) };
  },

  markPasswordChanged: () => {
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (!storedUser) {
      return;
    }

    const updatedUser = { ...storedUser, mustChangePassword: false };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set((state) => ({
      user: state.user ? { ...state.user, mustChangePassword: false } : updatedUser,
    }));
  },

  logout: () => {
    clearStoredAuth();
    set({ user: null, accessToken: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!accessToken || !user) {
      set({ user: null, accessToken: null, isAuthenticated: false, authLoaded: true });
      return;
    }

    const decodedToken = jwtDecode(accessToken);
    const isTokenExpired = decodedToken.exp * 1000 < Date.now();

    if (isTokenExpired) {
      clearStoredAuth();
      set({ user: null, accessToken: null, isAuthenticated: false, authLoaded: true });
      return;
    }

    const hydratedUser = {
      ...user,
      name: decodedToken.name,
      email: user.email || decodedToken.sub,
      profilePictureUrl: decodedToken.profilePictureUrl,
      mustChangePassword: Boolean(user.mustChangePassword),
    };

    localStorage.setItem('user', JSON.stringify(hydratedUser));
    set({
      user: hydratedUser,
      accessToken,
      isAuthenticated: true,
      authLoaded: true,
    });
  },
}));

export default useAuthStore;
