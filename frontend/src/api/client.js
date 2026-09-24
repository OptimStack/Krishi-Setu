import axios from 'axios';
import { executeMockRequest } from './mockService';

// Detect if running in pure static/serverless deployment without an external backend API
const isPureStaticDeployment =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('netlify.app') ||
    window.location.hostname.includes('github.io')) &&
  !import.meta.env.VITE_API_BASE_URL;

let liveBackendConfirmedUnavailable = isPureStaticDeployment;

// Create standard Axios client with hybrid mock/live adapter
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  adapter: async (config) => {
    // 1. If static hosting detected without external backend, serve directly from mockService without network failure
    if (liveBackendConfirmedUnavailable) {
      let payload = config.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {}
      }
      const mockResult = await executeMockRequest(
        config.method || 'get',
        config.url || '',
        payload,
        config.params
      );
      return {
        data: mockResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        request: {},
      };
    }

    // 2. Otherwise, attempt live backend request
    try {
      const defaultAdapter = axios.getAdapter(axios.defaults.adapter);
      return await defaultAdapter(config);
    } catch (err) {
      const status = err.response?.status;
      const isMissingBackend =
        !status ||
        status === 404 ||
        status === 405 || // Static hosts (Vercel/Netlify) return 405 when POST/PUT/DELETE is rewritten to static index.html
        (status >= 500 && status <= 599) ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED';

      if (isMissingBackend) {
        liveBackendConfirmedUnavailable = true; // Latch for subsequent requests to avoid repeated 405s
        let payload = config.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch {}
        }
        const mockResult = await executeMockRequest(
          config.method || 'get',
          config.url || '',
          payload,
          config.params
        );
        return {
          data: mockResult,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        };
      }
      throw err;
    }
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

// Normalize responses to { data, error } shape with intelligent mock fallback
client.interceptors.response.use(
  (response) => {
    // If Vercel or proxy returned an HTML page (like index.html rewrite or 404 text) for an API call
    if (
      typeof response.data === 'string' &&
      (response.data.includes('<!DOCTYPE html') ||
        response.data.includes('<html') ||
        response.data.includes('The page could not be found'))
    ) {
      console.warn(
        `[KrishiSetu API] Received non-JSON response from ${response.config.url}. Engaging client-side mock service.`
      );
      let payload = response.config.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {}
      }
      return executeMockRequest(
        response.config.method || 'get',
        response.config.url || '',
        payload,
        response.config.params
      );
    }

    // Flask API / Mock API already returns { data, error } — pass through directly
    return response.data;
  },
  async (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const url = error.config?.url || '';

    // Check if error is due to missing backend API endpoint, 405 Method Not Allowed, or server crash
    const isMissingBackend =
      !status ||
      status === 404 ||
      status === 405 ||
      status === 500 ||
      status === 502 ||
      status === 503 ||
      status === 504 ||
      (status >= 500 && status <= 599) ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('405') ||
      error.message?.includes('500') ||
      (typeof responseData === 'string' &&
        (responseData.includes('The page could not be found') ||
          responseData.includes('<!DOCTYPE html') ||
          responseData.includes('FUNCTION_INVOCATION_FAILED') ||
          responseData.includes('Method Not Allowed') ||
          responseData.includes('Internal Server Error')));

    if (isMissingBackend && error.config) {
      liveBackendConfirmedUnavailable = true;
      console.warn(
        `[KrishiSetu API] Live backend unavailable or returned error ${status || 'NETWORK'} for ${url}. Falling back to demo mock service.`
      );
      try {
        let requestData = error.config.data;
        if (typeof requestData === 'string') {
          try {
            requestData = JSON.parse(requestData);
          } catch {}
        }
        const mockResult = await executeMockRequest(
          error.config.method || 'get',
          url,
          requestData,
          error.config.params
        );
        return mockResult; // Resolves the promise with valid mock data!
      } catch (mockErr) {
        console.error('[KrishiSetu API] Mock execution failed:', mockErr);
      }
    }

    // On 401, try silent refresh before redirecting
    if (status === 401 && !error.config._retry && !url.includes('/auth/login')) {
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

    const apiError =
      typeof responseData === 'object' && responseData !== null
        ? responseData.error
        : null;

    let friendlyMessage = 'An unexpected error occurred';
    if (typeof apiError === 'string') {
      friendlyMessage = apiError;
    } else if (apiError?.message) {
      friendlyMessage = apiError.message;
    } else if (status === 404) {
      friendlyMessage = 'Endpoint not found. Please try again or check connection.';
    } else if (status === 405) {
      friendlyMessage = 'Method not allowed by host.';
    } else if (error.message) {
      friendlyMessage = error.message;
    }

    // Return standardized error shape
    return Promise.reject({
      data: null,
      error: apiError || { code: 'NETWORK', message: friendlyMessage },
    });
  }
);

export default client;
