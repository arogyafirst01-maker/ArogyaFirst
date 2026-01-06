// /Users/anubhavtiwari/Desktop/ArogyaFirst/apps/web/src/utils/broadcast.js

// Create a BroadcastChannel instance for authentication events
const authChannel = new BroadcastChannel('arogyafirst-auth');

/**
 * Broadcasts an authentication event to all tabs.
 * @param {Object} message - The message to broadcast.
 * Message types: { type: 'login', accessToken, expiresIn } or { type: 'logout' }
 */
export function broadcastAuth(message) {
  authChannel.postMessage(message);
}

/**
 * Subscribes to authentication events from other tabs.
 * @param {Function} handler - The function to handle incoming messages.
 * @returns {Function} A cleanup function to remove the event listener.
 */
export function onAuthMessage(handler) {
  authChannel.onmessage = (event) => handler(event.data);
  return () => {
    authChannel.onmessage = null;
  };
}