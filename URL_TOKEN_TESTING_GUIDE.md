# Testing URL Token Integration

## 🎯 Quick Test Steps

### 1. **Start DbGate with Token**
Open DbGate in your browser with the token parameter:
```
http://localhost:5001/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiQWRtaW5pc3RyYXRvciIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWVpZGVudGlmaWVyIjoiUy0xLTUtMjEtMTQ4NTkwMjIwNi02MjkxMDAyOTMtMTI5NjgxNTIxLTUwMCIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6IiIsIklzU3VwZXJBZG1pbiI6IlRydWUiLCJleHAiOjE3NTYzMzEzODcsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6NjE5NTUiLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjQyMDAifQ.BvveSv5GIZlkkjZN8qcmIfLpXF6_JXtCB-Yr8gupOJY
```

### 2. **Check Console Messages**
Open Developer Tools (F12) and look for these messages:
```
✅ Token extracted from URL parameter
✅ Token is available: YES
```

### 3. **Test Token Availability**
In the browser console, run:
```javascript
dbgateDebug.isTokenAvailable()  // Should return true
dbgateDebug.getToken()          // Should show your token
```

### 4. **Create a Test Connection**
1. Click "Add new connection"
2. Fill in basic connection details:
   - Server: `localhost`
   - Engine: `SQL Server` (or any)
   - Database: `testdb`
   - User: `testuser`
3. Click "Test" or "Connect"

### 5. **Monitor API Calls**
Watch the console for these messages:
```
💾 Saving connection attempt: {connection: "localhost", success: true, hasToken: true}
🚀 Making API call to save connection history...
📡 API Request: https://localhost:7199/api/DatabaseManagmentUserHistory/AddDbUserHistory
✅ API Response: Success
✅ Connection history API call successful
✅ Connection history saved successfully
```

## 🔍 Troubleshooting

### ❌ **If no token messages appear:**
- Check the URL has the token parameter
- Verify the token is valid (not expired)
- Try manually: `dbgateDebug.setTokenFromUrl()`

### ❌ **If token available but no API calls:**
- Check if connection test/save is actually triggered
- Verify your API is running on HTTPS at `https://localhost:7199`
- Check browser network tab for failed requests

### ❌ **If API calls fail:**
- Check CORS settings on your API
- Verify API endpoint exists and accepts POST requests
- Check if token is being sent in Authorization header
- Verify your API validates the JWT token correctly

## 🧪 Manual Testing Commands

```javascript
// Check current state
dbgateDebug.isTokenAvailable()
dbgateDebug.getToken()

// Test API connectivity
dbgateDebug.testNetworkCall()

// Test connection history save
dbgateDebug.testConnectionHistory()

// Get existing history
dbgateDebug.getAllHistory()
```

## 📋 Expected API Request

Your API should receive a POST request like this:

**URL:** `https://localhost:7199/api/DatabaseManagmentUserHistory/AddDbUserHistory`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Body:**
```json
{
  "ConnectionName": "localhost",
  "DbType": "mssql",
  "DatabaseName": "testdb", 
  "Host": "localhost",
  "Port": "1433",
  "UserName": "testuser",
  "ConnectTime": "2025-08-27T10:30:00.000Z",
  "Status": "success",
  "ErrorMessage": "",
  "ExtraInfo": "{\"engine\":\"mssql\",\"authType\":\"sql\",\"connectionId\":\"conn-123\"}"
}
```

Now the token will be automatically extracted from the URL and the connection history should be saved to your external API when you create or test connections!
