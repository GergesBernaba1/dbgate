# Query History Database Table Structure

## Recommended Table: query_history

| Column Name     | Type         | Description                        |
|----------------|--------------|------------------------------------|
| id             | INT (PK, AI) | Unique identifier                  |
| user_id        | INT/FK       | User who executed the query        |
| sql            | TEXT         | The SQL query executed             |
| connection_id  | VARCHAR      | Database connection identifier     |
| database_name  | VARCHAR      | Name of the database               |
| executed_at    | DATETIME     | When the query was executed        |
| duration       | INT          | Execution time in milliseconds     |
| rows_affected  | INT          | Number of rows affected/returned   |
| status         | VARCHAR      | success/error/cancelled            |
| error_message  | TEXT         | Error details if query failed      |
| extra_info     | JSON/TEXT    | Additional metadata                |

## Sample DTO Class (C#)

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

## Suggested API Endpoints

- `POST /api/QueryHistory/AddQueryHistory` - Add new query
- `GET /api/QueryHistory/GetQueryHistory?filter=&limit=100&skip=0` - Get history with pagination
- `GET /api/QueryHistory/GetRecentQueries?conid=&database=&limit=20` - Get recent for connection
- `DELETE /api/QueryHistory/DeleteQueryHistory?id={id}` - Delete specific query
- `DELETE /api/QueryHistory/ClearQueryHistory` - Clear all history (optional)

## SQL Create Table Example (SQL Server)

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

-- Index for better performance
CREATE INDEX IX_query_history_user_executed ON query_history(user_id, executed_at DESC);
CREATE INDEX IX_query_history_connection ON query_history(connection_id, database_name, executed_at DESC);
```
