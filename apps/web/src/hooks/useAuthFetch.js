import { useState, useCallback } from 'react';
import authFetch from '../utils/authFetch.js';

/**
 * Custom hook for authenticated API requests with loading and error state management
 * @returns {object} Object containing loading state, error state, and fetchData function
 */
function useAuthFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Performs an authenticated fetch request
   * 
   * Response Shape (on success):
   * The backend uses successResponse() which returns:
   * {
   *   success: true,
   *   message: string,
   *   data: <controller payload>
   * }
   * 
   * To access controller data, use: response.data
   * Example: const { booking, paymentAdjustment } = response.data;
   * 
   * @param {string} url - The URL to fetch
   * @param {object} options - Fetch options
   * @returns {Promise<{success: boolean, message: string, data: object}>} Parsed JSON response
   * @throws {Error} On HTTP errors with message and optional errors array
   */
  const fetchData = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(url, options);
      
      // Handle 304 Not Modified - should not happen with cache busting, but handle gracefully
      if (response.status === 304) {
        console.warn('[fetchData] 304 Not Modified response - cache issue. Sending request again with no-cache header.');
        return fetchData(url, { ...options, headers: { ...options.headers, 'Cache-Control': 'no-cache' } });
      }
      
      if (!response.ok) {
        // Try to parse JSON error payload
        let payload = null;
        try {
          payload = await response.json();
        } catch (_) {
          // ignore JSON parse errors
        }
        const message = payload?.message || `HTTP error! status: ${response.status}`;
        const err = new Error(message);
        if (payload?.errors) err.errors = payload.errors;
        // Attach HTTP status to the error so callers can branch on it
        err.status = response.status;
        throw err;
      }
      const data = await response.json();
      return data;
    } catch (err) {
      // Attach error details to state for UI consumption
      setError(err.message || String(err));
      throw err; // rethrow so callers can handle errors and access err.errors
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchData };
}

export default useAuthFetch;
export { useAuthFetch };