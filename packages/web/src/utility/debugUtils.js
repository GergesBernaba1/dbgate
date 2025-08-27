// debugUtils.js
// Debug utilities for testing token and API integration

import tokenService from '../services/TokenService.js';
import databaseHistoryService from '../services/DatabaseHistoryService.js';

// Make debug utilities available globally for testing
window.dbgateDebug = {
  // Token utilities
  setTestToken: () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    tokenService.setToken(testToken);
    console.log('Test token set:', testToken);
  },
  
  setTokenFromUrl: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      tokenService.setToken(urlToken);
      console.log('Token set from URL:', urlToken);
      return urlToken;
    } else {
      console.log('No token found in URL');
      return null;
    }
  },
  
  getToken: () => {
    const token = tokenService.getToken();
    console.log('Current token:', token);
    return token;
  },
  
  isTokenAvailable: () => {
    const available = tokenService.isTokenAvailable();
    console.log('Token available:', available);
    return available;
  },
  
  // Quick diagnostics
  diagnose: () => {
    console.log('🔍 DbGate Token Diagnostics');
    console.log('========================');
    console.log('Current URL:', window.location.href);
    console.log('URL search params:', window.location.search);
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    console.log('Token in URL:', urlToken ? 'YES (length: ' + urlToken.length + ')' : 'NO');
    
    const currentToken = tokenService.getToken();
    console.log('Stored token:', currentToken ? 'YES (length: ' + currentToken.length + ')' : 'NO');
    console.log('Token available:', tokenService.isTokenAvailable());
    
    if (currentToken && urlToken) {
      console.log('Tokens match:', currentToken === urlToken ? 'YES' : 'NO');
    }
    
    console.log('LocalStorage token:', localStorage.getItem('accessToken') ? 'YES' : 'NO');
    
    return {
      hasUrlToken: !!urlToken,
      hasStoredToken: !!currentToken,
      isAvailable: tokenService.isTokenAvailable()
    };
  },

  clearToken: () => {
    tokenService.clearToken();
    console.log('Token cleared');
  },
  testConnectionHistory: async () => {
    try {
      console.log('Testing connection history API...');
      
      const testConnection = {
        displayName: 'Test Connection',
        engine: 'mssql',
        server: 'localhost',
        port: 1433,
        database: 'testdb',
        user: 'testuser',
        _id: 'test-conn-123'
      };
      
      console.log('Test connection data:', testConnection);
      
      const result = await databaseHistoryService.saveConnectionAttempt(testConnection, true, '');
      console.log('API call result:', result);
      
      return result;
    } catch (error) {
      console.error('API test failed:', error);
      throw error;
    }
  },
  
  getAllHistory: async () => {
    try {
      console.log('Getting all connection history...');
      const history = await databaseHistoryService.getAllConnectionHistory();
      console.log('Connection history:', history);
      return history;
    } catch (error) {
      console.error('Failed to get history:', error);
      throw error;
    }
  },
  
  // Network test
  testNetworkCall: async () => {
    try {
      console.log('Testing network call to API...');
      const response = await fetch('https://localhost:7199/api/DatabaseManagmentUserHistory/GetAllDbUserHistory', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenService.getToken()}`
        }
      });
      
      console.log('Network response status:', response.status);
      console.log('Network response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Network response data:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.error('Network error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Network test failed:', error);
      throw error;
    }
  }
};

console.log('Debug utilities loaded. Use window.dbgateDebug for testing.');
console.log('Available methods:');
console.log('- dbgateDebug.diagnose() - Quick diagnostics');
console.log('- dbgateDebug.setTestToken()');
console.log('- dbgateDebug.setTokenFromUrl()');
console.log('- dbgateDebug.getToken()');
console.log('- dbgateDebug.isTokenAvailable()');
console.log('- dbgateDebug.clearToken()');
console.log('- dbgateDebug.testConnectionHistory()');
console.log('- dbgateDebug.getAllHistory()');
console.log('- dbgateDebug.testNetworkCall()');

export default window.dbgateDebug;
