// connectionHistoryIntegration.js
// Utility functions to integrate database history with existing connection system

import databaseHistoryService from '../services/DatabaseHistoryService.js';
import { isTokenAvailable } from '../services/TokenService.js';
import { dispatchCacheChange } from './cache.ts';

/**
 * Convert DbGate connection object to history DTO format
 * @param {Object} connection - DbGate connection object
 * @returns {Object} History DTO format
 */
export function connectionToHistoryDto(connection) {
  return {
    connectionName: connection.displayName || connection.server || 'Unnamed Connection',
    dbType: connection.engine || 'unknown',
    databaseName: connection.database || connection.defaultDatabase || '',
    host: connection.server || connection.host || '',
    port: connection.port?.toString() || '',
    username: connection.user || connection.username || '',
    extraInfo: {
      engine: connection.engine,
      ssl: connection.ssl,
      authType: connection.authType,
      connectionId: connection._id,
      singleDatabase: connection.singleDatabase,
      useDatabaseUrl: connection.useDatabaseUrl,
      databaseUrl: connection.databaseUrl ? '[REDACTED]' : null // Don't store sensitive URLs
    }
  };
}

/**
 * Convert history DTO format (lowercase properties) to DbGate connection object
 * @param {Object} historyItem - History item from API with lowercase properties
 * @returns {Object} DbGate connection object
 */
export function historyDtoToConnectionLowercase(historyItem) {
  if (!historyItem) {
    throw new Error('History item is null or undefined');
  }

  let extraInfo = {};
  try {
    extraInfo = JSON.parse(historyItem.extraInfo || '{}');
  } catch (e) {
    console.warn('Failed to parse extra info from history item:', e);
    extraInfo = {};
  }

  // Validate required fields (using lowercase)
  if (!historyItem.dbType) {
    throw new Error('Missing database type (dbType) in history item');
  }

  if (!historyItem.host) {
    throw new Error('Missing host in history item');
  }

  const connection = {
    engine: historyItem.dbType,
    server: historyItem.host || '',
    port: historyItem.port ? parseInt(historyItem.port) : undefined,
    user: historyItem.userName || '',
    database: historyItem.databaseName || '',
    displayName: historyItem.connectionName || `${historyItem.host}:${historyItem.port}`,
    authType: extraInfo.authType,
    ssl: extraInfo.ssl,
    singleDatabase: extraInfo.singleDatabase,
    useDatabaseUrl: extraInfo.useDatabaseUrl,
    // Don't restore sensitive data like passwords or URLs
  };

  console.log('🔄 Converted lowercase history item to connection:', connection);
  return connection;
}

/**
 * Convert history DTO back to connection format for quick connect
 * @param {Object} historyItem - History item from API
 * @returns {Object} Connection object
 */
export function historyDtoToConnection(historyItem) {
  if (!historyItem) {
    throw new Error('History item is null or undefined');
  }

  let extraInfo = {};
  try {
    extraInfo = JSON.parse(historyItem.ExtraInfo || '{}');
  } catch (e) {
    console.warn('Failed to parse extra info from history item:', e);
    extraInfo = {};
  }

  // Validate required fields
  if (!historyItem.DbType) {
    throw new Error('Missing database type (DbType) in history item');
  }

  if (!historyItem.Host) {
    throw new Error('Missing host in history item');
  }

  const connection = {
    engine: historyItem.DbType,
    server: historyItem.Host || '',
    port: historyItem.Port ? parseInt(historyItem.Port) : undefined,
    user: historyItem.UserName || '',
    database: historyItem.DatabaseName || '',
    displayName: historyItem.ConnectionName || `${historyItem.Host}:${historyItem.Port}`,
    authType: extraInfo.authType,
    ssl: extraInfo.ssl,
    singleDatabase: extraInfo.singleDatabase,
    useDatabaseUrl: extraInfo.useDatabaseUrl,
    // Don't restore sensitive data like passwords or URLs
  };

  console.log('🔄 Converted history item to connection:', connection);
  return connection;
}

/**
 * Save connection attempt with proper error handling
 * @param {Object} connection - Connection object
 * @param {boolean} success - Whether connection was successful
 * @param {string} errorMessage - Error message if failed
 */
export async function saveConnectionAttempt(connection, success = true, errorMessage = '') {
  try {
    console.log('💾 [DEBUG] saveConnectionAttempt called with:', { 
      connection: connection.displayName || connection.server, 
      success, 
      hasToken: isTokenAvailable(),
      connectionObj: connection
    });
    
    if (!isTokenAvailable()) {
      console.log('⚠️ No token available - connection history will not be saved to external API');
      return null;
    }
    
    const historyData = connectionToHistoryDto(connection);
    console.log('🔄 [DEBUG] Converted to history DTO:', historyData);
    
    const result = await databaseHistoryService.saveConnectionAttempt({
      ...historyData,
      status: success ? 'success' : 'failure',
      errorMessage: errorMessage
    });
    
    console.log('✅ Connection history saved successfully:', result);
    
    // Trigger connection list refresh if connection was successful
    if (success) {
      console.log('🔄 Triggering connection list refresh');
      dispatchCacheChange({ key: 'connection-list-changed' });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to save connection history:', error);
    // Don't throw - we don't want to break the main connection flow
  }
}

/**
 * Get recent successful connections for quick connect
 * @param {number} limit - Number of connections to return
 * @returns {Promise<Array>} Array of connection objects
 */
export async function getRecentSuccessfulConnections(limit = 5) {
  try {
    const history = await databaseHistoryService.getRecentConnections(limit);
    return history.map(historyDtoToConnection);
  } catch (error) {
    console.warn('Failed to get recent connections:', error);
    return [];
  }
}

/**
 * Enhanced connection test that saves history
 * @param {Object} connection - Connection to test
 * @param {Function} originalTestFn - Original test function
 * @returns {Promise<Object>} Test result
 */
export async function testConnectionWithHistory(connection, originalTestFn) {
  let result;
  let success = false;
  let errorMessage = '';

  try {
    result = await originalTestFn(connection);
    success = !result?.errorMessage;
    errorMessage = result?.errorMessage || '';
  } catch (error) {
    success = false;
    errorMessage = error.message;
    throw error;
  } finally {
    // Save the attempt regardless of outcome
    await saveConnectionAttempt(connection, success, errorMessage);
  }

  return result;
}

export default {
  connectionToHistoryDto,
  historyDtoToConnection,
  historyDtoToConnectionLowercase,
  saveConnectionAttempt,
  getRecentSuccessfulConnections,
  testConnectionWithHistory
};
