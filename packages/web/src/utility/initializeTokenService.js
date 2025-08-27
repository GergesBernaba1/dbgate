// initializeTokenService.js
// Initialize token service for iframe communication

import tokenService from '../services/TokenService.js';

/**
 * Initialize token service and set up iframe communication
 * Call this early in your app initialization
 */
export function initializeTokenService() {
  // The token service already sets up the message listener in its constructor
  // and extracts token from URL if present
  
  console.log('Token service initialized - ready to receive tokens from parent iframe or URL');
  
  // Check if token was found and log it
  setTimeout(() => {
    import('../services/TokenService.js').then(({ default: tokenService }) => {
      if (tokenService.isTokenAvailable()) {
        console.log('✅ Token is available:', tokenService.getToken() ? 'YES' : 'NO');
        console.log('Token source: URL parameter or localStorage');
      } else {
        console.log('❌ No token found in URL parameter or localStorage');
      }
    });
  }, 100);
  
  // Optional: Send a ready message to parent to indicate iframe is loaded
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'dbgate-ready' }, '*');
  }
}

/**
 * Check if app is running in iframe
 */
export function isInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Request token from parent if running in iframe
 */
export function requestTokenFromParent() {
  if (isInIframe()) {
    window.parent.postMessage({ type: 'request-token' }, '*');
  }
}

export default {
  initializeTokenService,
  isInIframe,
  requestTokenFromParent
};
