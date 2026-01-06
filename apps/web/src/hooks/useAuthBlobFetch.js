import { useState, useCallback } from 'react';
import authFetch from '../utils/authFetch.js';

/**
 * Custom hook for authenticated blob API requests (files, downloads)
 * Mirrors useAuthFetch but handles blob responses instead of JSON
 * Handles auth headers, token refresh, and error states consistently
 * 
 * @returns {object} Object containing loading state, error state, and fetchBlob function
 */
function useAuthBlobFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Performs an authenticated fetch request and returns blob
   * 
   * @param {string} url - The URL to fetch
   * @param {object} options - Fetch options
   * @returns {Promise<Blob>} The blob response (e.g., PDF, CSV file data)
   * @throws {Error} On HTTP errors with descriptive message
   */
  const fetchBlob = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(url, options);
      
      if (!response.ok) {
        // Try to parse error response as JSON
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const payload = await response.json();
          errorMessage = payload?.message || errorMessage;
        } catch (_) {
          // If not JSON, try plain text
          try {
            errorMessage = await response.text() || errorMessage;
          } catch (_) {
            // Fall back to generic message
          }
        }
        const err = new Error(errorMessage);
        err.status = response.status;
        throw err;
      }

      // Return blob directly (don't parse JSON)
      const blob = await response.blob();
      return blob;
    } catch (err) {
      // Attach error to state for UI consumption
      setError(err.message || String(err));
      throw err; // rethrow so callers can handle errors
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchBlob };
}

export default useAuthBlobFetch;
export { useAuthBlobFetch };
