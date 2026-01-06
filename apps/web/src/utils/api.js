/**
 * API Utility
 * 
 * Provides a simple API client for making authenticated HTTP requests.
 * This is a lightweight wrapper around authFetch for use outside React components.
 */

import authFetch from './authFetch.js';

/**
 * API client with methods for common HTTP operations
 */
export const api = {
  /**
   * Perform a GET request
   * @param {string} url - The endpoint URL
   * @param {Object} options - Additional fetch options
   * @returns {Promise<Object>} Response data
   */
  async get(url, options = {}) {
    const response = await authFetch(url, {
      method: 'GET',
      ...options,
    });

    if (!response.ok) {
      const error = await this._handleError(response);
      throw error;
    }

    return await response.json();
  },

  /**
   * Perform a POST request
   * @param {string} url - The endpoint URL
   * @param {Object} data - Request body data
   * @param {Object} options - Additional fetch options
   * @returns {Promise<Object>} Response data
   */
  async post(url, data, options = {}) {
    const response = await authFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const error = await this._handleError(response);
      throw error;
    }

    return await response.json();
  },

  /**
   * Perform a PUT request
   * @param {string} url - The endpoint URL
   * @param {Object} data - Request body data
   * @param {Object} options - Additional fetch options
   * @returns {Promise<Object>} Response data
   */
  async put(url, data, options = {}) {
    const response = await authFetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    if (!response.ok) {
      const error = await this._handleError(response);
      throw error;
    }

    return await response.json();
  },

  /**
   * Perform a DELETE request
   * @param {string} url - The endpoint URL
   * @param {Object} options - Additional fetch options
   * @returns {Promise<Object>} Response data
   */
  async delete(url, options = {}) {
    const response = await authFetch(url, {
      method: 'DELETE',
      ...options,
    });

    if (!response.ok) {
      const error = await this._handleError(response);
      throw error;
    }

    return await response.json();
  },

  /**
   * Handle error responses
   * @private
   * @param {Response} response - Fetch response object
   * @returns {Promise<Error>} Error object with message and details
   */
  async _handleError(response) {
    let payload = null;
    try {
      payload = await response.json();
    } catch (_) {
      // Ignore JSON parse errors
    }

    const message = payload?.message || `HTTP error! status: ${response.status}`;
    const error = new Error(message);
    
    if (payload?.errors) {
      error.errors = payload.errors;
    }
    
    error.status = response.status;
    error.response = payload;

    return error;
  },
};
