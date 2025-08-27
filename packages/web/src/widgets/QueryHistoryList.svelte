<script lang="ts">
  import _ from 'lodash';

  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import WidgetsInnerContainer from '../widgets/WidgetsInnerContainer.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import { onMount } from 'svelte';
  import openNewTab from '../utility/openNewTab';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { apiCall, apiOff, apiOn } from '../utility/api';
  import queryHistoryService from '../services/QueryHistoryService.js';
  import tokenService from '../services/TokenService.js';
  import { showSnackbarError } from '../utility/snackbar';

  let filter = '';
  let search = '';
  let historyItems = [];
  let isLoading = false;
  let useExternalApi = false;

  // Check if external API should be used
  $: useExternalApi = tokenService.isTokenAvailable();

  async function reloadItems() {
    if (useExternalApi) {
      await reloadFromExternalApi();
    } else {
      await reloadFromLocalApi();
    }
  }

  async function reloadFromExternalApi() {
    try {
      isLoading = true;
      historyItems = await queryHistoryService.getQueryHistory({ 
        filter: search, 
        limit: 100 
      });
    } catch (error) {
      console.error('Failed to load query history from external API:', error);
      showSnackbarError('Failed to load query history: ' + error.message);
      historyItems = [];
    } finally {
      isLoading = false;
    }
  }

  async function reloadFromLocalApi() {
    try {
      isLoading = true;
      const resp = await apiCall('query-history/read', { filter: search, limit: 100 });
      historyItems = resp;
    } catch (error) {
      console.error('Failed to load query history from local API:', error);
      historyItems = [];
    } finally {
      isLoading = false;
    }
  }

  $: {
    search;
    reloadItems();
  }

  const setDebouncedFilter = _.debounce(value => (search = value), 500);

  $: setDebouncedFilter(filter);

  onMount(() => {
    // Listen for local API events only if not using external API
    if (!useExternalApi) {
      apiOn('query-history-changed', reloadItems);
    }
    
    // Listen for token changes to switch between APIs
    window.addEventListener('tokenUpdated', () => {
      useExternalApi = tokenService.isTokenAvailable();
      reloadItems();
    });
    
    return () => {
      if (!useExternalApi) {
        apiOff('query-history-changed', reloadItems);
      }
    };
  });

  async function deleteHistoryItem(item) {
    if (useExternalApi && item.id) {
      try {
        await queryHistoryService.deleteQueryHistory(item.id);
        await reloadItems();
      } catch (error) {
        showSnackbarError('Failed to delete query: ' + error.message);
      }
    }
  }
</script>

<SearchBoxWrapper>
  <SearchInput placeholder="Search query history" {filter} bind:value={filter} />
  <CloseSearchButton
    bind:filter
    on:click={() => {
      search = '';
    }}
  />
</SearchBoxWrapper>
<WidgetsInnerContainer>
  {#if isLoading}
    <div class="loading">
      <FontIcon icon="icon loading" />
      Loading query history...
    </div>
  {/if}

  {#if !isLoading && historyItems.length === 0}
    <div class="empty">
      <FontIcon icon="icon info" />
      No query history found
      {#if useExternalApi}
        <div class="api-info">(Using external database)</div>
      {:else}
        <div class="api-info">(Using local storage)</div>
      {/if}
    </div>
  {/if}

  {#each historyItems as item}
    <div class="wrapper">
      <div
        class="query-item"
        title={item.sql}
        on:click={() => {
          openNewTab(
            {
              title: 'Query #',
              icon: 'icon sql-file',
              tabComponent: 'QueryTab',
              focused: true,
              props: {
                conid: item.conid,
                database: item.database,
              },
            },
            { editor: item.sql }
          );
        }}
      >
        <div class="sql">
          <FontIcon icon="icon sql-file" />
          {item.sql}
        </div>
        <div class="info">
          <FontIcon icon="icon database" />
          {item.database}
          {#if item.duration}
            • {item.duration}ms
          {/if}
          {#if item.rowsAffected !== undefined}
            • {item.rowsAffected} rows
          {/if}
          {#if item.status && item.status !== 'success'}
            • <span class="status-{item.status}">{item.status}</span>
          {/if}
        </div>
      </div>
      
      {#if useExternalApi && item.id}
        <button 
          class="delete-btn"
          on:click|stopPropagation={() => deleteHistoryItem(item)}
          title="Delete query from history"
        >
          <FontIcon icon="icon delete" />
        </button>
      {/if}
    </div>
  {/each}
</WidgetsInnerContainer>

<style>
  .wrapper {
    display: flex;
    align-items: center;
    padding: 5px;
    position: relative;
  }
  .wrapper:hover {
    background-color: var(--theme-bg-hover);
  }
  
  .query-item {
    flex: 1;
    cursor: pointer;
  }
  
  .info {
    margin-left: 30px;
    margin-top: 5px;
    color: var(--theme-font-3);
    font-size: 0.9em;
  }
  
  .sql {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .loading, .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    color: var(--theme-font-2);
    font-style: italic;
  }
  
  .api-info {
    font-size: 0.8em;
    color: var(--theme-font-3);
  }
  
  .delete-btn {
    background: none;
    border: none;
    color: var(--theme-font-3);
    cursor: pointer;
    padding: 4px;
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .wrapper:hover .delete-btn {
    opacity: 1;
  }
  
  .delete-btn:hover {
    background: var(--theme-bg-red);
    color: var(--theme-font-red);
  }
  
  .status-error {
    color: var(--theme-font-red);
  }
  
  .status-cancelled {
    color: var(--theme-font-orange);
  }
</style>
