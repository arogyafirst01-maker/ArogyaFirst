import { getValidAccessToken, clearToken } from './tokenManager.js';
import { broadcastAuth } from './broadcast.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Authenticated fetch wrapper with automatic token refresh
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} The fetch response
 */
async function authFetch(url, options = {}) {
  async function doFetch(withRetry = true) {
    let accessToken;
    try {
      accessToken = await getValidAccessToken().catch(() => null);
    } catch (error) {
      accessToken = null;
    }

    const headers = new Headers(options.headers);

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // Set Content-Type to application/json if body is provided and not already set
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, { ...options, headers, credentials: 'include' });

    if (response.status === 401 && withRetry) {
      try {
        // Attempt to refresh token
        await getValidAccessToken();
        // If successful, retry the request without retry
        return doFetch(false);
      } catch (refreshError) {
        // Refresh failed, clear token and broadcast logout
        clearToken();
        broadcastAuth({ type: 'logout' });
      }
    }

    return response;
  }

  return doFetch(true);
}

export default authFetch;
export { authFetch };
