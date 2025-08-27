/**
 * Global authentication utility for handling tokens in iframe context
 */

let globalAuthToken = null;

/**
 * Get authentication token from multiple sources in priority order:
 * 1. Manually set token via setAuthToken()
 * 2. URL parameter 'token'
 * 3. Manual fallback (for development)
 * 4. PostMessage from parent window
 */
export function getAuthToken() {
  // 1. Check manually set token first
  if (globalAuthToken) {
    return globalAuthToken;
  }

  // 2. Check URL parameters
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      return urlToken;
    }
  } catch (error) {
    console.warn('Failed to read URL parameters:', error);
  }

  // 3. Check environment variable (fallback for development)
  try {
    // For development - you can set a fallback token here if needed
    const fallbackToken = null; // Set to your development token if needed
    if (fallbackToken) {
      return fallbackToken;
    }
  } catch (error) {
    console.warn('Failed to read environment variables:', error);
  }

  return null;
}

/**
 * Manually set the authentication token
 * Useful for dynamic token updates from parent window
 */
export function setAuthToken(token) {
  globalAuthToken = token;
  // Notify other services that token is available
  window.dispatchEvent(new CustomEvent('tokenUpdated', { detail: { token } }));
}

/**
 * Clear the authentication token
 */
export function clearAuthToken() {
  globalAuthToken = null;
}

/**
 * Get authorization headers object with the current token
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) {
    return {};
  }

  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Setup listener for postMessage authentication from parent window
 * Call this once in your main app component
 */
export function setupAuthTokenListener() {
  if (typeof window === 'undefined') return;

  window.addEventListener('message', (event) => {
    // Add origin check for security in production
    // if (event.origin !== 'https://trusted-parent-domain.com') return;

    if (event.data && event.data.type === 'AUTH_TOKEN') {
      setAuthToken(event.data.token);
      console.log('Auth token received from parent window');
    }
  });
}

/**
 * Check if we're running in an iframe
 */
export function isInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Check if token is available
 */
export function isTokenAvailable() {
  return !!getAuthToken();
}

// Legacy class-based interface for backward compatibility
class TokenService {
  getToken() {
    return getAuthToken();
  }

  setToken(token) {
    setAuthToken(token);
  }

  clearToken() {
    clearAuthToken();
  }

  isTokenAvailable() {
    return isTokenAvailable();
  }
}

const tokenService = new TokenService();
export default tokenService;
