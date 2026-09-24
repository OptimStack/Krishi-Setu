import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize responses to { data, error } shape
client.interceptors.response.use(
  (response) => {
    // Flask API already returns { data, error } — pass through directly
    return response.data;
  },
  async (error) => {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;

    // On 401, try silent refresh before redirecting
    if (status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(
            `${client.defaults.baseURL}/auth/refresh`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
          );
          const newAccessToken = res.data?.data?.access_token;
          if (newAccessToken) {
            localStorage.setItem('access_token', newAccessToken);
            error.config.headers.Authorization = `Bearer ${newAccessToken}`;
            return client(error.config).then((r) => r);
          }
        } catch (_refreshErr) {
          // Refresh failed — fall through to logout
        }
      }

      // No refresh token or refresh failed — clear auth and redirect
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Return standardized error shape
    return Promise.reject({
      data: null,
      error: apiError || { code: 'NETWORK', message: error.message || 'An error occurred' },
    });
  }
);

export default client;
