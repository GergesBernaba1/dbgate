// QueryHistoryService.js
// Service to manage query history using external API

import { getAuthHeaders, isTokenAvailable } from './TokenService.js';

class QueryHistoryService {
  constructor() {
    this.baseUrl = 'https://localhost:7199/api/DatabaseManagmentUserHistory'; // Adjust this to match your API
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
   * Save query to history using the database
   * @param {Object} queryData - Query data to save
   */
  async saveQuery(queryData) {
    try {
      if (!isTokenAvailable()) {
        console.log('⚠️ No token available - query history will not be saved');
        return null;
      }

      // Convert query data to connection history format
      const historyDto = {
        ConnectionName: `Query: ${queryData.sql?.substring(0, 50) || 'Unknown Query'}...`,
        DbType: queryData.engine || 'unknown',
        DatabaseName: queryData.database || '',
        Host: queryData.server || 'localhost',
        Port: queryData.port?.toString() || '',
        UserName: queryData.user || '',
        ConnectTime: new Date().toISOString(),
        Status: 'success',
        ErrorMessage: '',
        ExtraInfo: JSON.stringify({
          type: 'query',
          sql: queryData.sql,
          duration: queryData.duration,
          rowCount: queryData.rowCount,
          engine: queryData.engine,
          database: queryData.database,
          timestamp: queryData.timestamp || new Date().toISOString()
        })
      };

      const response = await fetch(`${this.baseUrl}/AddDbUserHistory`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(historyDto)
      });

      return await this._handleResponse(response);
    } catch (error) {
      console.error('❌ Error saving query history:', error);
      return null;
    }
  }

  /**
   * Get query history from database
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Query history items
   */
  async getQueryHistory(options = {}) {
    try {
      if (!isTokenAvailable()) {
        console.log('⚠️ No token available - returning empty query history');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/GetAllDbUserHistory`, {
        method: 'GET',
        headers: this._getAuthHeaders()
      });

      const allHistory = await this._handleResponse(response);
      
      // Filter for query history items
      let queryHistory = allHistory
        .filter(record => {
          try {
            const extraInfo = JSON.parse(record.ExtraInfo || '{}');
            return extraInfo.type === 'query';
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => new Date(b.ConnectTime) - new Date(a.ConnectTime))
        .map(record => {
          try {
            const extraInfo = JSON.parse(record.ExtraInfo || '{}');
            return {
              id: record.Id,
              sql: extraInfo.sql,
              duration: extraInfo.duration,
              rowCount: extraInfo.rowCount,
              engine: extraInfo.engine,
              database: extraInfo.database,
              timestamp: extraInfo.timestamp || record.ConnectTime,
              server: record.Host,
              user: record.UserName,
              conid: `${record.Host}:${record.Port}/${record.DatabaseName}`,
              date: new Date(record.ConnectTime).getTime()
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      // Apply filters if provided
      if (options.filter) {
        const filterLower = options.filter.toLowerCase();
        queryHistory = queryHistory.filter(item => 
          item.sql?.toLowerCase().includes(filterLower) ||
          item.database?.toLowerCase().includes(filterLower) ||
          item.server?.toLowerCase().includes(filterLower)
        );
      }

      // Apply limit and skip
      const skip = options.skip || 0;
      const limit = options.limit || 50;
      
      return queryHistory.slice(skip, skip + limit);
    } catch (error) {
      console.error('❌ Error getting query history:', error);
      return [];
    }
  }

  /**
   * Delete query from history
   * @param {number} id - Query history ID
   */
  async deleteQuery(id) {
    try {
      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${this.baseUrl}/DeleteDbUserHistory?id=${id}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });

      return await this._handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting query history:', error);
      throw error;
    }
  }

  /**
   * Clear all query history
   */
  async clearQueryHistory() {
    try {
      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      // Get all query history items
      const queryHistory = await this.getQueryHistory();
      
      // Delete each query history item
      for (const query of queryHistory) {
        await this.deleteQuery(query.id);
      }

      return true;
    } catch (error) {
      console.error('❌ Error clearing query history:', error);
      throw error;
    }
  }

  /**
   * Search query history
   * @param {string} searchTerm - Search term
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Matching query history records
   */
  async searchQueryHistory(searchTerm, limit = 50) {
    try {
      return await this.getQueryHistory({ 
        filter: searchTerm, 
        limit 
      });
    } catch (error) {
      console.error('Error searching query history:', error);
      return [];
    }
  }

  /**
   * Get recent queries for specific connection/database
   * @param {string} conid - Connection ID
   * @param {string} database - Database name
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} Recent queries
   */
  async getRecentQueries(conid, database, limit = 20) {
    try {
      const allQueries = await this.getQueryHistory({ limit: 100 });
      
      // Filter by connection and database
      return allQueries
        .filter(query => 
          query.conid === conid && 
          query.database === database
        )
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent queries:', error);
      return [];
    }
  }

  // Legacy method aliases for backward compatibility
  async addQueryHistory(queryData) {
    return this.saveQuery(queryData);
  }

  async deleteQueryHistory(id) {
    return this.deleteQuery(id);
  }
}

const queryHistoryService = new QueryHistoryService();
export default queryHistoryService;
