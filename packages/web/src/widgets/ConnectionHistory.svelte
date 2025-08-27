<script>
  import { onMount } from 'svelte';
  import databaseHistoryService from '../services/DatabaseHistoryService.js';
  import { isTokenAvailable } from '../services/TokenService.js';
  import { historyDtoToConnection } from '../utility/connectionHistoryIntegration.js';
  import { openConnection } from '../appobj/ConnectionAppObject.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { showSnackbarError, showSnackbarSuccess } from '../utility/snackbar';
  import { formatDistanceToNow } from 'date-fns';

  export let limit = 10;
  export let showActions = true;

  let connectionHistory = [];
  let isLoading = false;
  let error = null;

  onMount(() => {
    // Wait a bit for token to be extracted from URL
    setTimeout(() => {
      if (isTokenAvailable()) {
        loadHistory();
      } else {
        console.log('⚠️ ConnectionHistory: No token available, skipping history load');
      }
    }, 500);
    
    // Listen for token updates
    window.addEventListener('tokenUpdated', () => {
      console.log('🔄 ConnectionHistory: Token updated, loading history');
      loadHistory();
    });
  });

  async function loadHistory() {
    if (!isTokenAvailable()) {
      console.log('⚠️ ConnectionHistory: No token available, skipping history load');
      return;
    }
    
    isLoading = true;
    error = null;
    try {
      console.log('📊 ConnectionHistory: Loading connection history...');
      const rawHistory = await databaseHistoryService.getAllRecentHistory(limit);
      
      // Filter out invalid entries and add safety checks
      connectionHistory = rawHistory.filter(item => {
        try {
          // Basic validation
          if (!item || !item.Id) {
            console.warn('Skipping invalid history item (missing ID):', item);
            return false;
          }
          
          // Validate date
          if (item.ConnectTime) {
            const date = new Date(item.ConnectTime);
            if (isNaN(date.getTime())) {
              console.warn('Skipping history item with invalid date:', item.ConnectTime);
              item.ConnectTime = new Date().toISOString(); // Use current time as fallback
            }
          }
          
          return true;
        } catch (error) {
          console.warn('Error validating history item:', error, item);
          return false;
        }
      });
      
      console.log('✅ ConnectionHistory: Loaded', connectionHistory.length, 'valid connections');
    } catch (err) {
      error = err.message;
      console.error('❌ ConnectionHistory: Failed to load:', err);
      showSnackbarError('Failed to load connection history: ' + err.message);
      connectionHistory = []; // Reset to empty array on error
    } finally {
      isLoading = false;
    }
  }

  async function deleteHistoryItem(id) {
    try {
      await databaseHistoryService.deleteConnectionHistory(id);
      showSnackbarSuccess('Connection history item deleted');
      await loadHistory(); // Refresh the list
    } catch (error) {
      showSnackbarError('Failed to delete history item: ' + error.message);
    }
  }

  async function quickConnect(historyItem) {
    try {
      console.log('🚀 Quick connecting to:', historyItem);
      
      // Validate required fields
      if (!historyItem || !historyItem.Host || !historyItem.DbType) {
        throw new Error('Invalid connection data - missing required fields');
      }
      
      // Convert history item back to connection object
      const connection = historyDtoToConnection(historyItem);
      if (!connection) {
        throw new Error('Failed to convert history item to connection');
      }
      
      connection.unsaved = true; // Mark as temporary connection
      
      console.log('🔄 Converted connection:', connection);
      
      // Open the connection
      openConnection(connection);
      showSnackbarSuccess(`Connecting to ${getConnectionDisplayName(historyItem)}...`);
    } catch (error) {
      console.error('❌ Failed to quick connect:', error);
      showSnackbarError('Failed to connect: ' + error.message);
    }
  }

  function getConnectionDisplayName(connection) {
    try {
      return connection.ConnectionName || 
             `${connection.Host || 'Unknown'}:${connection.Port || ''}/${connection.DatabaseName || ''}`;
    } catch (error) {
      console.warn('Error formatting connection display name:', error);
      return 'Unknown Connection';
    }
  }

  function getConnectionSubtitle(connection) {
    try {
      const connectTime = new Date(connection.ConnectTime);
      const timeAgo = isNaN(connectTime.getTime()) 
        ? 'Unknown time' 
        : formatDistanceToNow(connectTime, { addSuffix: true });
      
      return `${connection.DbType} • ${connection.UserName} • ${timeAgo}`;
    } catch (error) {
      console.warn('Error formatting connection subtitle:', error);
      return `${connection.DbType} • ${connection.UserName} • Unknown time`;
    }
  }

  function getStatusColor(status) {
    return status === 'success' ? 'var(--theme-font-green)' : 'var(--theme-font-red)';
  }
</script>

<div class="connection-history">
  <div class="header">
    <FontIcon icon="icon history" />
    Connection History
    <button class="refresh-btn" on:click={loadHistory} disabled={isLoading}>
      <FontIcon icon="icon refresh" />
    </button>
  </div>

  {#if isLoading}
    <div class="loading">
      <FontIcon icon="icon loading" />
      Loading history...
    </div>
  {/if}

  {#if error}
    <div class="error">
      <FontIcon icon="icon error" />
      {error}
    </div>
  {/if}

  {#if !isLoading && !error && connectionHistory.length === 0}
  {/if}

  {#if !isLoading && !error && connectionHistory.length > 0}
    <div class="history-list">
      {#each connectionHistory as connection}
        {#if connection && connection.Id}
          <div class="history-item">
            <div class="connection-info">
              <div class="connection-name">
                {getConnectionDisplayName(connection)}
              </div>
              <div class="connection-details">
                {getConnectionSubtitle(connection)}
              </div>
              <div class="connection-status" style="color: {getStatusColor(connection.Status)}">
                <FontIcon icon={connection.Status === 'success' ? 'icon check' : 'icon error'} />
                {connection.Status}
              </div>
            </div>
            
            {#if showActions}
              <div class="actions">
                {#if connection.Status === 'success'}
                  <button 
                    class="action-btn connect-btn"
                    on:click={() => quickConnect(connection)}
                    title="Quick connect"
                  >
                    <FontIcon icon="icon connect" />
                  </button>
                {/if}
                <button 
                  class="action-btn delete-btn"
                  on:click={() => deleteHistoryItem(connection.Id)}
                  title="Delete history item"
                >
                  <FontIcon icon="icon delete" />
                </button>
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .connection-history {
    padding: 8px;
    border: 1px solid var(--theme-border);
    border-radius: 4px;
    background: var(--theme-bg-1);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-weight: bold;
    color: var(--theme-font-1);
  }

  .refresh-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: var(--theme-font-2);
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
  }

  .refresh-btn:hover {
    background: var(--theme-bg-hover);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading, .error, .empty {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    color: var(--theme-font-2);
    font-style: italic;
  }

  .error {
    color: var(--theme-font-red);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border: 1px solid var(--theme-border-2);
    border-radius: 4px;
    background: var(--theme-bg-2);
  }

  .history-item:hover {
    background: var(--theme-bg-hover);
  }

  .connection-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .connection-name {
    font-weight: 500;
    color: var(--theme-font-1);
  }

  .connection-details {
    font-size: 0.9em;
    color: var(--theme-font-2);
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8em;
    font-weight: 500;
  }

  .actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    background: none;
    border: none;
    color: var(--theme-font-2);
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
  }

  .action-btn:hover {
    background: var(--theme-bg-hover);
    color: var(--theme-font-1);
  }

  .connect-btn {
    color: var(--theme-font-green);
  }

  .connect-btn:hover {
    background: var(--theme-bg-green);
    color: var(--theme-font-1);
  }

  .delete-btn {
    color: var(--theme-font-red);
  }

  .delete-btn:hover {
    background: var(--theme-bg-red);
    color: var(--theme-font-1);
  }
</style>
