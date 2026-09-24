import client from './client';

/**
 * Login with phone/email and password.
 * @param {{ phone: string, password: string }} credentials
 * @returns {Promise<{ data: { access_token, refresh_token, user }, error }>}
 */
export const login = (credentials) => client.post('/auth/login', credentials);

/**
 * Register a new user.
 * @param {{ name, phone, password, role, email? }} data
 * @returns {Promise<{ data: { access_token, refresh_token, user }, error }>}
 */
export const register = (data) => client.post('/auth/register', data);

/**
 * Refresh the access token using the refresh token.
 * Called automatically by the API client interceptor on 401.
 */
export const refreshToken = () => client.post('/auth/refresh');

/**
 * Get the current authenticated user's profile.
 */
export const getMe = () => client.get('/auth/me');
