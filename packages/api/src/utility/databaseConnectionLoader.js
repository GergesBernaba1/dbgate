// databaseConnectionLoader.js
// Server-side utility to load connections from external database API

const axios = require('axios').default;
const https = require('https');
const { getLogger } = require('dbgate-tools');

const logger = getLogger('databaseConnectionLoader');

class DatabaseConnectionLoader {
  constructor() {
    this.baseUrl = 'https://localhost:7199/api/DatabaseManagmentUserHistory';
  }

  /**
   * Load a specific connection from the database by ID
   * @param {string} connectionId - Connection ID (e.g., 'db-config-3')
   * @param {Object} req - Express request object with auth information
   * @param {string} urlToken - URL token for external API authentication
   * @returns {Promise<Object|null>} Connection object or null if not found
   */
  async loadConnectionById(connectionId, req = null, urlToken = null) {
    try {
      // Extract the numeric ID from 'db-config-X' format
      const match = connectionId.match(/^db-config-(\d+)$/);
      if (!match) {
        logger.info(`Invalid database connection ID format: ${connectionId}`);
        return null;
      }

      const id = match[1];
      logger.info(`Loading database connection for ID: ${id}`);

      // Get auth token from URL token parameter or request headers
      let authHeaders = {
        'Content-Type': 'application/json'
      };
      
      // Prioritize URL token for external API calls
      if (urlToken) {
        authHeaders['Authorization'] = `Bearer ${urlToken}`;
        logger.info(`🔍 Using URL token for external API: ${urlToken.substring(0, 20)}...`);
      } else if (req && req.headers && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        logger.info(`🔍 Using request auth header: ${authHeader.substring(0, 30)}...`);
        authHeaders['Authorization'] = authHeader;
      } else {
        logger.warn('No authorization token available - API call may fail');
        logger.info(`🔍 Request headers available: ${JSON.stringify(Object.keys(req?.headers || {}))}`);
      }

      // Create HTTPS agent that ignores self-signed certificates
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });

      logger.info(`📡 Making request to: ${this.baseUrl}/GetAllDbUserHistory`);
      logger.info(`📡 Authorization header: ${authHeaders['Authorization']?.substring(0, 20)}...`);

      const response = await axios.get(`${this.baseUrl}/GetAllDbUserHistory`, {
        headers: authHeaders,
        httpsAgent: httpsAgent
      });

      logger.info(`🌐 External API response status: ${response.status} ${response.statusText}`);

      const allHistory = response.data;
      logger.info(`🌐 External API returned ${allHistory.length} records`);
      
      // Find the specific connection by ID
      const connectionRecord = allHistory.find(record => 
        record.id == id || record.ID == id || record.Id == id
      );

      if (!connectionRecord) {
        logger.info(`❌ Connection not found in database for ID: ${id}`);
        logger.info(`🔍 Available connection IDs: ${allHistory.map(r => r.id || r.ID || r.Id).join(', ')}`);
        return null;
      }

      logger.info(`✅ Found connection record:`, JSON.stringify(connectionRecord, null, 2));

      // Convert to DbGate format
      const connection = this.convertToDbGateFormat(connectionRecord, connectionId);
      logger.info(`Successfully loaded connection: ${connection._id} (${connection.displayName})`);
      
      return connection;
    } catch (error) {
      logger.error(`❌ Error loading database connection ${connectionId}: ${error.message}`);
      
      // Enhanced error logging for axios errors
      if (error.response) {
        logger.error(`❌ Response status: ${error.response.status}`);
        logger.error(`❌ Response headers: ${JSON.stringify(error.response.headers)}`);
        logger.error(`❌ Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        logger.error(`❌ Request was made but no response received`);
        logger.error(`❌ Request config: ${JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        })}`);
      } else {
        logger.error(`❌ Error in request setup: ${error.message}`);
      }
      
      logger.error(`❌ Error stack: ${error.stack}`);
      return null;
    }
  }

  /**
   * Convert database record to DbGate connection format
   * @param {Object} record - Raw database record
   * @param {string} connectionId - Connection ID to use
   * @returns {Object} DbGate connection object
   */
  convertToDbGateFormat(record, connectionId) {
    // Handle both your API format (lowercase) and our format (capitalized)
    const connectionName = record.connectionName || record.ConnectionName || '';
    const host = record.host || record.Host || '';
    const port = record.port || record.Port || '';
    const userName = record.userName || record.UserName || '';
    const databaseName = record.databaseName || record.DatabaseName || '';
    const dbType = record.dbType || record.DbType || '';
    const extraInfo = record.extraInfo || record.ExtraInfo || '{}';

    // NEW: Handle the expanded schema fields directly from the API
    const password = record.password || record.Password || '';
    const passwordMode = record.passwordMode || record.PasswordMode || 'saveNot';
    const isReadOnly = record.isReadOnly || record.IsReadOnly || false;
    const useSchemasSparately = record.useSchemasSparately || record.UseSchemasSparately || false;
    const defaultDatabase = record.defaultDatabase || record.DefaultDatabase || '';
    const color = record.color || record.Color || '';
    const fillDatabaseConnectionDetails = record.fillDatabaseConnectionDetails || record.FillDatabaseConnectionDetails || false;
    const useDatabaseURL = record.useDatabaseURL || record.UseDatabaseURL || false;
    const databaseURL = record.databaseURL || record.DatabaseURL || '';
    const connectionMode = record.connectionMode || record.ConnectionMode || 'direct';
    const authentication = record.authentication || record.Authentication || '';

    // Parse extra info (legacy support)
    let parsedExtraInfo = {};
    try {
      if (typeof extraInfo === 'string') {
        parsedExtraInfo = JSON.parse(extraInfo);
      } else {
        parsedExtraInfo = extraInfo || {};
      }
    } catch (e) {
      logger.warn(`Failed to parse extraInfo: ${e.message}`, extraInfo);
      parsedExtraInfo = {};
    }

    // Convert to DbGate connection format with all required properties
    const connection = {
      _id: connectionId,
      displayName: connectionName || `${host}${port ? ':' + port : ''}`,
      server: host || '',
      user: userName || '',
      database: databaseName || '',
      engine: dbType || 'unknown',
      
      // Parse port properly
      port: port && port !== '' ? parseInt(port) : undefined,
      
      // NEW: Map the expanded schema fields to DbGate format
      password: password || parsedExtraInfo.password || '',
      passwordMode: passwordMode || 'saveNot',
      isReadOnly: Boolean(isReadOnly),
      useSchemasSeparately: Boolean(useSchemasSparately), // Note: DbGate uses different case
      defaultDatabase: defaultDatabase || databaseName || '',
      color: color || '',
      fillConnectionDetails: Boolean(fillDatabaseConnectionDetails),
      useDatabaseUrl: Boolean(useDatabaseURL),
      databaseUrl: databaseURL || parsedExtraInfo.databaseUrl || '',
      connectionMode: connectionMode || 'direct',
      authentication: authentication || parsedExtraInfo.authentication || '',
      
      // Extract additional info from extraInfo (legacy support)
      authType: parsedExtraInfo.authType || 'sql',
      ssl: parsedExtraInfo.ssl || false,
      singleDatabase: parsedExtraInfo.singleDatabase || false,
      
      // Add properties needed for DbGate functionality
      unsaved: false, // Mark as saved (not temporary)
      savedToDatabase: true, // Mark as database-sourced
      lastSaved: record.connectTime || record.ConnectTime,
      
      // Add optional properties if they exist in extraInfo (legacy)
      ...(parsedExtraInfo.connectionId && { connectionId: parsedExtraInfo.connectionId }),
    };

    // Clean up undefined values but keep empty strings and false booleans
    Object.keys(connection).forEach(key => {
      if (connection[key] === undefined) {
        delete connection[key];
      }
    });

    logger.info(`🔧 Converted external API record to DbGate format:`, JSON.stringify({
      id: connection._id,
      displayName: connection.displayName,
      server: connection.server,
      database: connection.database,
      engine: connection.engine,
      hasPassword: !!connection.password,
      passwordMode: connection.passwordMode
    }, null, 2));

    return connection;
  }
}

module.exports = DatabaseConnectionLoader;
