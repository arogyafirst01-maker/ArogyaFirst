// Token manager for frontend authentication with localStorage persistence
let token = null; // { accessToken: string, expiresAt: number (epoch ms) }
let refreshInFlight = null; // Promise or null for deduplication

const TOKEN_KEY = 'arogyafirst_token';

/**
 * Load token from localStorage on initialization
 */
function loadTokenFromStorage() {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only restore if not expired (with 30-second buffer)
      if (parsed.expiresAt && Date.now() < parsed.expiresAt - 30000) {
        token = parsed;
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  } catch (error) {
    console.error('Failed to load token from storage:', error);
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Load token on module initialization
loadTokenFromStorage();

/**
 * Store access token with calculated expiry time
 * @param {string} accessToken - The access token
 * @param {number} expiresIn - Expiry time in seconds
 */
export function setAccessToken(accessToken, expiresIn) {
  token = {
    accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };
  // Persist to localStorage
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch (error) {
    console.error('Failed to store token:', error);
  }
}

/**
 * Clear stored token
 */
export function clearToken() {
  token = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear token from storage:', error);
  }
}

/**
 * Return access token if valid (not expired with 30-second buffer), otherwise null
 * @returns {string|null} The access token or null
 */
export function getAccessToken() {
  if (token && Date.now() < token.expiresAt - 30000) {
    return token.accessToken;
  }
  return null;
}

/**
 * Private async function to perform token refresh
 * @returns {Promise<string>} The new access token
 */
async function performRefresh() {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const { data: { accessToken, expiresIn } } = await response.json();
  setAccessToken(accessToken, expiresIn);
  return accessToken;
}

/**
 * Get a valid access token, refreshing if necessary
 * @returns {Promise<string>} The valid access token
 */
export async function getValidAccessToken() {
  const currentToken = getAccessToken();
  if (currentToken) {
    return currentToken;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = performRefresh();
  refreshInFlight.finally(() => {
    setTimeout(() => {
      refreshInFlight = null;
    }, 0);
  });

  return refreshInFlight;
}