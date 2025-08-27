# Query History Database Integration

This document explains how query history has been modified to store data in your external database instead of local files when a token is available.

## Overview

The query history system now works in a hybrid mode:
- **With Token**: Stores query history in your external database via API
- **Without Token**: Uses the original local file storage system

## Database Table Structure

### Recommended Table: `query_history`

```sql
CREATE TABLE query_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    sql NTEXT NOT NULL,
    connection_id NVARCHAR(255) NULL,
    database_name NVARCHAR(255) NULL,
    executed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    duration INT NULL DEFAULT 0,
    rows_affected INT NULL DEFAULT 0,
    status NVARCHAR(50) NULL DEFAULT 'success',
    error_message NTEXT NULL,
    extra_info NTEXT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Indexes for performance
CREATE INDEX IX_query_history_user_executed ON query_history(user_id, executed_at DESC);
CREATE INDEX IX_query_history_connection ON query_history(connection_id, database_name, executed_at DESC);
```

## Required API Endpoints

Your API should implement these endpoints:

### 1. Add Query History
- **Endpoint**: `POST /api/QueryHistory/AddQueryHistory`
- **Body**: QueryHistoryDto

### 2. Get Query History
- **Endpoint**: `GET /api/QueryHistory/GetQueryHistory?filter=&limit=100&skip=0`
- **Returns**: Array of QueryHistoryDto

### 3. Get Recent Queries (Optional)
- **Endpoint**: `GET /api/QueryHistory/GetRecentQueries?conid=&database=&limit=20`
- **Returns**: Array of QueryHistoryDto for specific connection/database

### 4. Delete Query History (Optional)
- **Endpoint**: `DELETE /api/QueryHistory/DeleteQueryHistory?id={id}`

### 5. Clear Query History (Optional)
- **Endpoint**: `DELETE /api/QueryHistory/ClearQueryHistory`

## DTO Structure

```csharp
public class QueryHistoryDto
{
    public int Id { get; set; }
    public string Sql { get; set; }
    public string ConnectionId { get; set; }
    public string DatabaseName { get; set; }
    public string ExecutedAt { get; set; }  // ISO datetime string
    public int Duration { get; set; }       // milliseconds
    public int RowsAffected { get; set; }
    public string Status { get; set; }      // "success", "error", "cancelled"
    public string ErrorMessage { get; set; }
    public string ExtraInfo { get; set; }   // JSON string
}
```

## Files Modified

### New Files:
- `packages/web/src/services/QueryHistoryService.js` - External API integration service

### Modified Files:
- `packages/web/src/widgets/QueryHistoryList.svelte` - Hybrid mode support, delete functionality
- `packages/web/src/tabs/QueryTab.svelte` - Enhanced history saving with execution details

## Key Features

### 1. Hybrid Mode Operation
- Automatically detects if token is available
- Uses external API when token present, local storage otherwise
- Seamless switching when token is received

### 2. Enhanced Query Tracking
- Captures SQL query text
- Records execution time (duration)
- Tracks connection and database context
- Stores execution status (success/error)
- Includes additional metadata in ExtraInfo

### 3. Improved UI
- Shows API source indicator (external vs local)
- Delete functionality for external API records
- Enhanced query information display (duration, rows affected, status)
- Loading states and error handling

### 4. Security
- All API calls include Bearer token authentication
- Sensitive data properly handled
- Graceful degradation when API unavailable

## Configuration

To change the API base URL, edit:
```javascript
// packages/web/src/services/QueryHistoryService.js
constructor() {
  this.baseUrl = 'https://localhost:7199/api/QueryHistory';
}
```

## Usage Flow

1. **User executes query** in QueryTab
2. **System checks** if token is available
3. **If token available**:
   - Saves query to external API
   - Records execution details
   - Updates UI with external data
4. **If no token**:
   - Uses original local file system
   - Maintains backward compatibility

## Sample API Controller (C#)

```csharp
[ApiController]
[Route("api/[controller]")]
public class QueryHistoryController : ControllerBase
{
    [HttpPost("AddQueryHistory")]
    public IActionResult AddQueryHistory([FromBody] QueryHistoryDto dto)
    {
        // Implementation
    }

    [HttpGet("GetQueryHistory")]
    public IActionResult GetQueryHistory(string filter = "", int limit = 100, int skip = 0)
    {
        // Implementation with filtering and pagination
    }

    [HttpGet("GetRecentQueries")]
    public IActionResult GetRecentQueries(string conid, string database, int limit = 20)
    {
        // Implementation for connection-specific queries
    }

    [HttpDelete("DeleteQueryHistory")]
    public IActionResult DeleteQueryHistory(int id)
    {
        // Implementation
    }
}
```

## Testing

1. **Setup**: Ensure your API is running at the configured URL
2. **Token**: Send token to DbGate via iframe postMessage
3. **Execute**: Run SQL queries in DbGate
4. **Verify**: Check that queries appear in your database
5. **UI**: Confirm history widget shows "(Using external database)"

## Migration Notes

- Existing local query history remains accessible when no token is present
- No data loss occurs during the transition
- Users can switch between modes seamlessly
- External API is only used when explicitly authenticated with token

This implementation provides a seamless upgrade path while maintaining backward compatibility with the existing local storage system.
