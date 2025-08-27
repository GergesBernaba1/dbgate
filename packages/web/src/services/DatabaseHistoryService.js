// DatabaseHistoryService.js
// Service to manage database connection history using external API

import { getAuthHeaders, isTokenAvailable } from './TokenService.js';

class DatabaseHistoryService {
  constructor() {
    this.baseUrl = 'https://localhost:7199/api/DatabaseManagmentUserHistory';
  }

  /**
   * Get authorization headers with token
   */
  _getAuthHeaders() {
    const authHeaders = getAuthHeaders();
    console.log('🔑 Getting auth headers - Token available:', isTokenAvailable());
    
    const headers = {
      'Content-Type': 'application/json',
      ...authHeaders
    };
    
    console.log('📤 Request headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': headers['Authorization'] ? 'Bearer [TOKEN_PRESENT]' : 'NO_AUTH_HEADER'
    });
    
    return headers;
  }

  /**
   * Handle API response and errors
   */
  async _handleResponse(response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return await response.json();
  }

  /**
   * Add new database connection history record
   * @param {Object} connectionData - Connection details
   * @returns {Promise<Object>} API response
   */
  async addConnectionHistory(connectionData) {
    try {
      console.log('🔧 [addConnectionHistory] Input data:', connectionData);
      
      const historyDto = {
        ConnectionName: connectionData.connectionName || '',
        DbType: connectionData.dbType || '',
        DatabaseName: connectionData.databaseName || '',
        Host: connectionData.host || '',
        Port: connectionData.port?.toString() || '',
        UserName: connectionData.username || '',
        ConnectTime: new Date().toISOString(),
        Status: connectionData.status || 'success',
        ErrorMessage: connectionData.errorMessage || '',
        ExtraInfo: JSON.stringify(connectionData.extraInfo || {})
      };

      console.log('� [addConnectionHistory] DTO to send:', historyDto);
      console.log('�📡 API Request URL:', `${this.baseUrl}/AddDbUserHistory`);

      const response = await fetch(`${this.baseUrl}/AddDbUserHistory`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(historyDto)
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        console.log('✅ API Response: Success');
        const responseData = await response.json();
        console.log('✅ Response data:', responseData);
        return responseData;
      } else {
        const errorText = await response.text();
        console.error('❌ API Response Error:', response.status, response.statusText);
        console.error('❌ Error body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Network/API Error in addConnectionHistory:', error);
      throw error;
    }
  }

  /**
   * Update existing database connection history record
   * @param {Object} connectionData - Connection details with ID
   * @returns {Promise<Object>} API response
   */
  async updateConnectionHistory(connectionData) {
    try {
      const historyDto = {
        Id: connectionData.id,
        ConnectionName: connectionData.connectionName || '',
        DbType: connectionData.dbType || '',
        DatabaseName: connectionData.databaseName || '',
        Host: connectionData.host || '',
        Port: connectionData.port?.toString() || '',
        UserName: connectionData.username || '',
        ConnectTime: connectionData.connectTime || new Date().toISOString(),
        Status: connectionData.status || 'success',
        ErrorMessage: connectionData.errorMessage || '',
        ExtraInfo: JSON.stringify(connectionData.extraInfo || {})
      };

      const response = await fetch(`${this.baseUrl}/UpdateDbUserHistory`, {
        method: 'PUT',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(historyDto)
      });

      return await this._handleResponse(response);
    } catch (error) {
      console.error('Error updating connection history:', error);
      throw error;
    }
  }

  /**
   * Delete database connection history record
   * @param {number} id - Record ID to delete
   * @returns {Promise<Object>} API response
   */
  async deleteConnectionHistory(id) {
    try {
      const response = await fetch(`${this.baseUrl}/DeleteDbUserHistory?id=${id}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });

      return await this._handleResponse(response);
    } catch (error) {
      console.error('Error deleting connection history:', error);
      throw error;
    }
  }

  /**
   * Get all database connection history records
   * @returns {Promise<Array>} List of connection history records
   */
  async getAllConnectionHistory() {
    try {
      const response = await fetch(`${this.baseUrl}/GetAllDbUserHistory`, {
        method: 'GET',
        headers: this._getAuthHeaders()
      });

      const rawData = await this._handleResponse(response);
      
      // Normalize property names - convert lowercase API response to capitalized format
      const normalizedData = rawData.map(item => ({
        Id: item.id,
        ConnectionName: item.connectionName,
        DbType: item.dbType,
        DatabaseName: item.databaseName,
        Host: item.host,
        Port: item.port,
        UserName: item.userName,
        ConnectTime: item.connectTime,
        Status: item.status,
        ErrorMessage: item.errorMessage,
        ExtraInfo: item.extraInfo
      }));
      
      console.log('🔄 Normalized API response from lowercase to capitalized properties:', normalizedData.length);
      return normalizedData;
    } catch (error) {
      console.error('Error getting connection history:', error);
      throw error;
    }
  }

  /**
   * Save connection attempt (success or failure)
   * @param {Object} connectionConfig - Database connection configuration
   * @param {boolean} success - Whether connection was successful
   * @param {string} errorMessage - Error message if connection failed
   */
  async saveConnectionAttempt(connectionConfig, success = true, errorMessage = '') {
    try {
      console.log('🔧 [DatabaseHistoryService] saveConnectionAttempt called with:', {
        connectionConfig,
        success,
        errorMessage
      });

      const connectionData = {
        connectionName: connectionConfig.connectionName || connectionConfig.displayName || connectionConfig.server || 'Unnamed Connection',
        dbType: connectionConfig.dbType || connectionConfig.engine || 'unknown',
        databaseName: connectionConfig.databaseName || connectionConfig.database || '',
        host: connectionConfig.host || connectionConfig.server || '',
        port: connectionConfig.port,
        username: connectionConfig.username || connectionConfig.user || '',
        status: connectionConfig.status || (success ? 'success' : 'failure'),
        errorMessage: connectionConfig.errorMessage || errorMessage,
        extraInfo: connectionConfig.extraInfo || {
          engine: connectionConfig.engine,
          ssl: connectionConfig.ssl,
          authType: connectionConfig.authType,
          connectionId: connectionConfig._id
        }
      };

      console.log('� [DatabaseHistoryService] Calling addConnectionHistory with:', connectionData);
      const result = await this.addConnectionHistory(connectionData);
      console.log('✅ Connection history API call successful');
      return result;
    } catch (error) {
      console.error('❌ Error saving connection attempt:', error);
      // Don't throw error here to avoid breaking the main connection flow
      return null;
    }
  }

  /**
   * Get recent connections for quick access
   * @param {number} limit - Number of recent connections to return
   * @returns {Promise<Array>} Recent successful connections
   */
  async getRecentConnections(limit = 10) {
    try {
      const allHistory = await this.getAllConnectionHistory();
      
      // Filter successful connections and get unique ones by host+database
      const successfulConnections = allHistory
        .filter(record => record.Status === 'success')
        .sort((a, b) => new Date(b.ConnectTime) - new Date(a.ConnectTime));

      // Remove duplicates based on host + database + username
      const uniqueConnections = [];
      const seen = new Set();
      
      for (const connection of successfulConnections) {
        const key = `${connection.Host}:${connection.Port}:${connection.DatabaseName}:${connection.UserName}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueConnections.push(connection);
          if (uniqueConnections.length >= limit) break;
        }
      }

      return uniqueConnections;
    } catch (error) {
      console.error('Error getting recent connections:', error);
      return [];
    }
  }

  /**
   * Get all recent connection history (including failed attempts)
   * @param {number} limit - Number of recent connections to return
   * @returns {Promise<Array>} Recent connection history
   */
  async getAllRecentHistory(limit = 10) {
    try {
      const allHistory = await this.getAllConnectionHistory();
      
      // Sort by connect time (most recent first)
      const sortedHistory = allHistory
        .sort((a, b) => new Date(b.ConnectTime) - new Date(a.ConnectTime))
        .slice(0, limit);

      return sortedHistory;
    } catch (error) {
      console.error('Error getting recent history:', error);
      return [];
    }
  }
}

const databaseHistoryService = new DatabaseHistoryService();
export default databaseHistoryService;
