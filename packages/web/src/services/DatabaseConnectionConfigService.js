// DatabaseConnectionConfigService.js
// Service to save/load connection configurations (like local storage) using external database

import { isTokenAvailable } from './TokenService.js';
import { resolveApiHeaders } from '../utility/resolveApi';
import { dispatchCacheChange } from '../utility/cache.ts';
import { apiCall } from '../utility/api';

class DatabaseConnectionConfigService {
  constructor() {
    this.baseUrl = 'https://localhost:7199/api/DatabaseManagmentUserHistory';
  }

  /**
   * Get authorization headers with token for external API calls
   */
  _getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      ...resolveApiHeaders(true) // Use external API token routing
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
   * Save connection configuration (like connections/save API)
   * @param {Object} connection - Connection configuration object
   * @returns {Promise<Object>} Saved connection with _id
   */
  async saveConnectionConfig(connection) {
    try {
      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      // NEW: Create data with expanded schema fields
      const configData = {
        ConnectionName: connection.displayName || connection.server || 'Unnamed Connection',
        DbType: connection.engine || 'unknown',
        DatabaseName: connection.database || '',
        Host: connection.server || '',
        Port: connection.port?.toString() || '',
        UserName: connection.user || '',
        ConnectTime: new Date().toISOString(),
        Status: 'config', // Special status for saved configurations
        ErrorMessage: '',
        
        // Core expanded schema fields
        Password: connection.password || '',
        PasswordMode: connection.passwordMode || 'saveNot',
        IsReadOnly: Boolean(connection.isReadOnly || false),
        UseSchemasSparately: Boolean(connection.useSchemasSeparately || false),
        DefaultDatabase: connection.defaultDatabase || connection.database || '',
        Color: connection.color || '',
        FillDatabaseConnectionDetails: Boolean(connection.fillConnectionDetails || false),
        UseDatabaseURL: Boolean(connection.useDatabaseUrl || false),
        DatabaseURL: connection.databaseUrl || '',
        ConnectionMode: connection.connectionMode || 'direct',
        Authentication: connection.authentication || '',
        
        // COMPLETE: All possible UI connection fields from DbGate storage model
        ExtraInfo: JSON.stringify({
          type: 'connection-config',
          originalConnection: connection,
          
          // Basic connection info
          engine: connection.engine,
          authType: connection.authType || 'sql',
          serviceName: connection.serviceName || '',
          serviceNameType: connection.serviceNameType || '',
          socketPath: connection.socketPath || '',
          treeKeySeparator: connection.treeKeySeparator || '',
          windowsDomain: connection.windowsDomain || '',
          trustServerCertificate: Boolean(connection.trustServerCertificate || false),
          singleDatabase: Boolean(connection.singleDatabase || false),
          
          // SSH Tunnel settings
          useSshTunnel: Boolean(connection.useSshTunnel || false),
          sshHost: connection.sshHost || '',
          sshPort: connection.sshPort || '',
          sshMode: connection.sshMode || '',
          sshKeyFile: connection.sshKeyFile || '',
          sshKeyfilePassword: connection.sshKeyfilePassword || '',
          sshLogin: connection.sshLogin || '',
          sshPassword: connection.sshPassword || '',
          sshBastionHost: connection.sshBastionHost || '',
          
          // SSL settings
          useSsl: Boolean(connection.useSsl || connection.ssl || false),
          ssl: Boolean(connection.ssl || false), // Legacy support
          sslCaFile: connection.sslCaFile || '',
          sslCertFile: connection.sslCertFile || '',
          sslCertFilePassword: connection.sslCertFilePassword || '',
          sslKeyFile: connection.sslKeyFile || '',
          sslRejectUnauthorized: Boolean(connection.sslRejectUnauthorized !== false), // Default true
          
          // Advanced connection settings
          clientLibraryPath: connection.clientLibraryPath || '',
          useRedirectDbLogin: Boolean(connection.useRedirectDbLogin || false),
          allowedDatabases: connection.allowedDatabases || '',
          allowedDatabasesRegex: connection.allowedDatabasesRegex || '',
          
          // Cloud/AWS settings
          endpoint: connection.endpoint || '',
          endpointKey: connection.endpointKey || '',
          accessKeyId: connection.accessKeyId || '',
          secretAccessKey: connection.secretAccessKey || '',
          awsRegion: connection.awsRegion || '',
          
          // Additional fields specific to certain database types
          databaseFile: connection.databaseFile || '', // For SQLite, DuckDB
          authToken: connection.authToken || '', // For LibSQL
          
          // Plugin-specific fields that might exist
          maxRetries: connection.maxRetries || 0,
          connectionTimeout: connection.connectionTimeout || 0,
          adaptiveRetry: Boolean(connection.adaptiveRetry || false),
          initialRetryDelay: connection.initialRetryDelay || 0,
          retryBackoffMultiplier: connection.retryBackoffMultiplier || 0,
          jitterFactor: connection.jitterFactor || 0,
          
          // Legacy compatibility
          password: connection.password,
          useDatabaseUrl: connection.useDatabaseUrl,
          databaseUrl: connection.databaseUrl,
          authentication: connection.authentication
        })
      };

      const response = await fetch(`${this.baseUrl}/AddDbUserHistory`, {
        method: 'POST',
        headers: this._getAuthHeaders(),
        body: JSON.stringify(configData)
      });

      const result = await this._handleResponse(response);
      
      // Return connection with database-generated _id
      const savedConnection = {
        ...connection,
        _id: `db-config-${result.id || result.Id}`,
        savedToDatabase: true
      };

      // Trigger connection list refresh
      dispatchCacheChange({ key: 'connection-list-changed' });
      
      console.log('✅ Connection configuration saved to database with expanded schema:', savedConnection._id);
      return savedConnection;
    } catch (error) {
      console.error('❌ Error saving connection config to database:', error);
      throw error;
    }
  }

  /**
   * Register a single database connection as volatile connection with the server just-in-time
   * @param {Object} connection - Connection configuration
   * @returns {Promise<Object>} Registration result or original connection
   */
  async registerConnectionJIT(connection) {
    try {
      console.log('🔧 JIT registration for connection:', connection._id);
      
      // Use the existing newConnection endpoint to create a volatile connection
      const result = await apiCall('connections/newConnection', {
        engine: connection.engine,
        server: connection.server,
        user: connection.user,
        port: connection.port,
        database: connection.database,
        displayName: connection.displayName,
        authType: connection.authType || 'sql',
        ssl: connection.ssl || false,
        test: false // Don't test, just create volatile connection
      });
      
      console.log('✅ JIT registration successful:', result);
      return result;
    } catch (error) {
      console.error('❌ JIT registration failed, using original connection:', error);
      // Fallback to original connection if registration fails
      return connection;
    }
  }

  /**
   * Get all saved connection configurations
   * @returns {Promise<Array>} Array of connection configurations in DbGate format
   */
  async getSavedConnectionConfigs() {
    try {
      if (!isTokenAvailable()) {
        console.log('⚠️ No token available - returning empty connection configs');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/GetAllDbUserHistory`, {
        method: 'GET',
        headers: this._getAuthHeaders()
      });

      const allHistory = await this._handleResponse(response);
      console.log('🔍 Raw API data for connections:', allHistory);
      
      // Convert your API data to DbGate connection format
      const connectionConfigs = allHistory
        .filter(record => {
          // Only include successful connections or connection configs
          const status = record.status || record.Status;
          return status === 'success' || status === 'config';
        })
        .map(record => {
          try {
            // Handle both your API format (lowercase) and our format (capitalized)
            const id = record.id || record.Id;
            const connectionName = record.connectionName || record.ConnectionName;
            const dbType = record.dbType || record.DbType;
            const host = record.host || record.Host;
            const port = record.port || record.Port;
            const userName = record.userName || record.UserName;
            const databaseName = record.databaseName || record.DatabaseName;
            const extraInfo = record.extraInfo || record.ExtraInfo || '{}';
            
            let parsedExtraInfo = {};
            try {
              parsedExtraInfo = JSON.parse(extraInfo);
            } catch (e) {
              console.warn('Failed to parse extraInfo:', e);
            }

            // Convert to DbGate connection format with all required properties
            const connection = {
              _id: `db-config-${id}`,
              displayName: connectionName || `${host}${port ? ':' + port : ''}`,
              server: host || '',
              user: userName || '',
              database: databaseName || '',
              engine: dbType || 'unknown',
              
              // Parse port properly
              port: port && port !== '' ? parseInt(port) : undefined,
              
              // Extract additional info from extraInfo
              authType: parsedExtraInfo.authType || 'sql',
              ssl: parsedExtraInfo.ssl || false,
              singleDatabase: parsedExtraInfo.singleDatabase || false,
              useDatabaseUrl: parsedExtraInfo.useDatabaseUrl || false,
              
              // Add properties needed for DbGate functionality
              unsaved: false, // Mark as saved (not a temporary connection)
              savedToDatabase: true, // Mark as database-sourced
              lastSaved: record.connectTime || record.ConnectTime,
              
              // Add optional properties if they exist
              ...(parsedExtraInfo.connectionId && { connectionId: parsedExtraInfo.connectionId }),
              ...(parsedExtraInfo.databaseUrl && { databaseUrl: parsedExtraInfo.databaseUrl }),
              ...(parsedExtraInfo.password && { password: parsedExtraInfo.password }), // If password was stored
            };

            // Clean up undefined values but keep empty strings
            Object.keys(connection).forEach(key => {
              if (connection[key] === undefined) {
                delete connection[key];
              }
            });

            console.log('🔄 Converted API record to DbGate connection:', {
              original: record,
              converted: connection
            });

            return connection;
          } catch (e) {
            console.warn('Failed to convert connection record:', e, record);
            return null;
          }
        })
        .filter(Boolean) // Remove null entries
        .sort((a, b) => new Date(b.lastSaved) - new Date(a.lastSaved)); // Sort by most recent

      console.log(`✅ Converted ${connectionConfigs.length} API records to DbGate connections`);
      console.log('🔍 Final connections sample:', connectionConfigs.length > 0 ? connectionConfigs[0] : 'None');
      console.log('🔍 All connection IDs:', connectionConfigs.map(c => c._id));
      console.log('🔍 Connection properties check:', connectionConfigs.map(c => ({
        _id: c._id,
        displayName: c.displayName,
        server: c.server,
        engine: c.engine,
        hasAllRequiredProps: !!(c._id && c.displayName && c.server && c.engine)
      })));

      // Note: Connections will be registered just-in-time when opened
      console.log('🔧 Connections will be registered as volatile when opened');
      
      return connectionConfigs;
    } catch (error) {
      console.error('❌ Error getting connection configs from database:', error);
      return [];
    }
  }

  /**
   * Delete connection configuration
   * @param {string} connectionId - Connection ID (db-config-{id})
   * @returns {Promise<boolean>} Success status
   */
  async deleteConnectionConfig(connectionId) {
    try {
      if (!isTokenAvailable()) {
        throw new Error('No authentication token available');
      }

      // Extract the numeric ID from the connection ID
      const numericId = connectionId.replace('db-config-', '');
      
      const response = await fetch(`${this.baseUrl}/DeleteDbUserHistory?id=${numericId}`, {
        method: 'DELETE',
        headers: this._getAuthHeaders()
      });

      await this._handleResponse(response);
      
      // Trigger connection list refresh
      dispatchCacheChange({ key: 'connection-list-changed' });
      
      console.log('✅ Connection configuration deleted from database:', connectionId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting connection config from database:', error);
      throw error;
    }
  }
}

const databaseConnectionConfigService = new DatabaseConnectionConfigService();
export default databaseConnectionConfigService;
