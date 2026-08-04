import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingRequests.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = Cookies.get('refreshToken');
    if (!refreshToken) {
      clearAuth();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken },
      );
      Cookies.set('token', data.accessToken, { expires: 1 });
      Cookies.set('refreshToken', data.refreshToken, { expires: 30 });

      pendingRequests.forEach((cb) => cb(data.accessToken));
      pendingRequests = [];

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      clearAuth();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

function clearAuth() {
  Cookies.remove('token');
  Cookies.remove('refreshToken');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
