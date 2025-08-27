import App from './App.svelte';
import './utility/connectionsPinger';
import './utility/changeCurrentDbByTab';
import './commands/stdCommands';
import localStorageGarbageCollector from './utility/localStorageGarbageCollector';
import { handleOauthCallback } from './clientAuth';
import LoginPage from './LoginPage.svelte';
import NotLoggedPage from './NotLoggedPage.svelte';
import ErrorPage from './ErrorPage.svelte';
import EnterLicensePage from './EnterLicensePage.svelte';
import SetAdminPasswordPage from './SetAdminPasswordPage.svelte';
import RedirectPage from './RedirectPage.svelte';
import { initializeTokenService } from './utility/initializeTokenService.js';

// Import debug utilities in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  import('./utility/debugUtils.js').catch(console.error);
}

const isOauthCallback = handleOauthCallback();

localStorageGarbageCollector();

// Initialize token service for iframe communication
initializeTokenService();

function createApp() {
  if (isOauthCallback) {
    return null;
  }

  switch (window['dbgate_page']) {
    case 'login':
      return new LoginPage({
        target: document.body,
        props: {
          isAdminPage: false,
        },
      });
    case 'error':
      return new ErrorPage({
        target: document.body,
        props: {},
      });
    case 'license':
    case 'admin-license':
      return new EnterLicensePage({
        target: document.body,
        props: {},
      });
    case 'admin-login':
      return new LoginPage({
        target: document.body,
        props: {
          isAdminPage: true,
        },
      });
    case 'redirect':
      return new RedirectPage({
        target: document.body,
      });
    case 'not-logged':
      return new NotLoggedPage({
        target: document.body,
        props: {},
      });
    case 'set-admin-password':
      return new SetAdminPasswordPage({
        target: document.body,
        props: {},
      });
    case 'admin':
      return new App({
        target: document.body,
        props: {
          isAdminPage: true,
        },
      });
  }

  return new App({
    target: document.body,
    props: {},
  });
}

const app = createApp();

export default app;
