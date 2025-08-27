// DatabaseConnectionService.js
// Service to manage saved connections using external database instead of local storage

import { getAuthHeaders, isTokenAvailable } from './TokenService.js';
import { connectionToHistoryDto, historyDtoToConnection, historyDtoToConnectionLowercase } from '../utility/connectionHistoryIntegration.js';

class DatabaseConnectionService {
  constructor() {
    this.baseUrl = 'https://localhost:7199/api/DatabaseManagmentUserHistory';
  }

  /**
   * Get authorization headers with token
   */
  _getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    };
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
   * Get all saved connections (only successful ones that can be used to connect)
   * @returns {Promise<Array>} Array of connection objects
   */
  async getSavedConnections() {
    try {
      if (!isTokenAvailable()) {
        console.log('⚠️ No token available - returning empty connections list');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/GetAllDbUserHistory`, {
        method: 'GET',
        headers: this._getAuthHeaders()
      });

      const allHistory = await this._handleResponse(response);
      console.log('🔍 Raw API response:', allHistory);
      
      // Filter for successful connections and convert to connection objects
      const successfulConnections = allHistory
        .filter(record => record.Status === 'success') // Using capitalized 'Status'
        .sort((a, b) => new Date(b.ConnectTime) - new Date(a.ConnectTime)); // Using capitalized 'ConnectTime'

      console.log('🔍 Successful connections:', successfulConnections);

      // Remove duplicates and convert to connection objects
      const uniqueConnections = [];
      const seen = new Set();
      
      for (const historyItem of successfulConnections) {
        // Using capitalized property names (normalized by DatabaseHistoryService)
        const key = `${historyItem.Host}:${historyItem.Port}:${historyItem.DatabaseName}:${historyItem.UserName}`;
        if (!seen.has(key)) {
          seen.add(key);
          
          // Convert history item to connection object using original function
          const connection = historyDtoToConnection(historyItem);
          
          // Add database-specific properties
          connection._id = `db-history-${historyItem.Id}`;
          connection.fromDatabase = true;
          connection.historyId = historyItem.Id; // Using capitalized 'Id'
          connection.displayName = historyItem.ConnectionName; // Using capitalized 'ConnectionName'
          connection.lastConnected = historyItem.ConnectTime; // Using capitalized 'ConnectTime'
          
          uniqueConnections.push(connection);
        }
      }

      console.log(`✅ Loaded ${uniqueConnections.length} saved connections from database`);
      return uniqueConnections;
    } catch (error) {
      console.error('❌ Error getting saved connections:', error);
      return [];
    }
  }

  /**
   * Save a connection to the database
   * @param {Object} connection - Connection object to save
   * @returns {Promise<Object>} Saved connection object
   */
  async saveConnection(connection) {
    try {
      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      // Convert connection to history format
      const historyData = connectionToHistoryDto(connection);
      
      const historyDto = {
        ConnectionName: historyData.connectionName || connection.displayName || 'Saved Connection',
        DbType: historyData.dbType || 'unknown',
        DatabaseName: historyData.databaseName || '',
        Host: historyData.host || '',
        Port: historyData.port?.toString() || '',
        UserName: historyData.username || '',
        ConnectTime: new Date().toISOString(),
        Status: 'success',
        ErrorMessage: '',
        ExtraInfo: JSON.stringify({
          ...historyData.extraInfo,
          savedConnection: true, // Mark as intentionally saved
          originalConnectionId: connection._id
        })
      };

      const response = await fetch(`${this.baseUrl}/AddDbUserHistory`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(historyDto)
      });

      const result = await this._handleResponse(response);
      
      // Return the connection with database ID
      return {
        ...connection,
        _id: `db-history-${result.Id}`,
        fromDatabase: true,
        historyId: result.Id,
        lastConnected: historyDto.ConnectTime
      };
    } catch (error) {
      console.error('❌ Error saving connection:', error);
      throw error;
    }
  }

  /**
   * Delete a saved connection from the database
   * @param {string} connectionId - Connection ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteConnection(connectionId) {
    try {
      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      // Extract history ID from connection ID
      const historyId = connectionId.replace('db-history-', '');
      
      const response = await fetch(`${this.baseUrl}/DeleteDbUserHistory?id=${historyId}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });

      await this._handleResponse(response);
      return true;
    } catch (error) {
      console.error('❌ Error deleting connection:', error);
      throw error;
    }
  }

  /**
   * Update a saved connection in the database
   * @param {Object} connection - Updated connection object
   * @returns {Promise<Object>} Updated connection object
   */
  async updateConnection(connection) {
    try {
      if (!connection.historyId) {
        // If no history ID, treat as new connection
        return await this.saveConnection(connection);
      }

      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      const historyData = connectionToHistoryDto(connection);
      
      const historyDto = {
        Id: connection.historyId,
        ConnectionName: historyData.connectionName || connection.displayName || 'Updated Connection',
        DbType: historyData.dbType || 'unknown',
        DatabaseName: historyData.databaseName || '',
        Host: historyData.host || '',
        Port: historyData.port?.toString() || '',
        UserName: historyData.username || '',
        ConnectTime: connection.lastConnected || new Date().toISOString(),
        Status: 'success',
        ErrorMessage: '',
        ExtraInfo: JSON.stringify({
          ...historyData.extraInfo,
          savedConnection: true,
          originalConnectionId: connection._id
        })
      };

      const response = await fetch(`${this.baseUrl}/UpdateDbUserHistory`, {
        method: 'PUT',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(historyDto)
      });

      await this._handleResponse(response);
      
      return {
        ...connection,
        lastConnected: historyDto.ConnectTime
      };
    } catch (error) {
      console.error('❌ Error updating connection:', error);
      throw error;
    }
  }
}

const databaseConnectionService = new DatabaseConnectionService();
export default databaseConnectionService;
