# Database Connection History Integration

This implementation adds database connection history functionality to DbGate that integrates with your external API.

## Overview

The solution includes:

1. **TokenService** - Handles token passed from parent iframe
2. **DatabaseHistoryService** - Manages connection history via your external API
3. **ConnectionHistory widget** - Displays recent connections in the UI
4. **Integration utilities** - Helper functions to connect with existing DbGate code
5. **Automatic history tracking** - Saves connection attempts automatically

## Your External API Integration

The system is configured to work with your API at:
- Base URL: `https://localhost:7199/api/DatabaseManagmentUserHistory`
- Endpoints:
  - `POST /AddDbUserHistory` - Add new history record
  - `PUT /UpdateDbUserHistory` - Update existing record
  - `DELETE /DeleteDbUserHistory?id={id}` - Delete record
  - `GET /GetAllDbUserHistory` - Get all records

## How to Use

### 1. Parent Application (Iframe Host)

```javascript
// Send token to DbGate iframe
const iframe = document.getElementById('dbgate-iframe');
iframe.onload = () => {
  iframe.contentWindow.postMessage({ 
    token: 'YOUR_JWT_TOKEN_HERE' 
  }, '*');
};
```

### 2. Token Authentication

The token is automatically included in all API requests as:
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

### 3. Automatic History Tracking

Connection history is automatically saved when:
- Testing connections (success/failure)
- Making actual connections (success/failure)

### 4. Viewing History

The connection history widget appears in the ConnectionList sidebar when a token is available.

## Files Added/Modified

### New Files:
- `packages/web/src/services/TokenService.js` - Token management
- `packages/web/src/services/DatabaseHistoryService.js` - API integration
- `packages/web/src/widgets/ConnectionHistory.svelte` - History display widget
- `packages/web/src/utility/connectionHistoryIntegration.js` - Integration utilities
- `packages/web/src/utility/initializeTokenService.js` - Initialization

### Modified Files:
- `packages/web/src/tabs/ConnectionTab.svelte` - Added history tracking
- `packages/web/src/widgets/ConnectionList.svelte` - Added history widget
- `packages/web/src/main.ts` - Added token service initialization

## Configuration

To change the API base URL, edit:
```javascript
// packages/web/src/services/DatabaseHistoryService.js
constructor() {
  this.baseUrl = 'https://localhost:7199/api/DatabaseManagmentUserHistory';
}
```

## DTO Structure

The system maps DbGate connections to your DTO format:

```javascript
{
  Id: number,
  ConnectionName: string,
  DbType: string,
  DatabaseName: string,
  Host: string,
  Port: string,
  UserName: string,
  ConnectTime: string, // ISO datetime
  Status: string, // 'success' or 'failure'
  ErrorMessage: string,
  ExtraInfo: string // JSON string with additional data
}
```

## Security Notes

- Passwords and sensitive URLs are not stored in history
- Token validation should be implemented on your API side
- Consider implementing origin validation for postMessage
- Use HTTPS in production

## Testing

1. Set up your external API at the configured URL
2. Load DbGate in an iframe
3. Send a token via postMessage
4. Create/test database connections
5. Check that history appears in the sidebar and in your database

The history will show recent successful connections and allow quick access to previously used connection details.
