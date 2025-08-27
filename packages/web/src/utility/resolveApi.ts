import getElectron from './getElectron';
import { isAdminPage, isOneOfPage } from './pageDefs';
import { getAuthToken } from '../services/TokenService';

let apiUrl = null;
try {
  // @ts-ignore - process is available in browser through webpack
  apiUrl = process.env.API_URL;
} catch {}

export default function resolveApi() {
  if (apiUrl) {
    return apiUrl;
  }
  return (window.location.origin + window.location.pathname).replace(/\/[a-zA-Z-]+\.html$/, '').replace(/\/*$/, '');
}

export function resolveApiHeaders(isExternalApi = false) {
  const electron = getElectron();

  const res = {};
  
  // For external API calls, prioritize URL token
  if (isExternalApi) {
    const urlToken = getAuthToken();
    if (urlToken) {
      res['Authorization'] = `Bearer ${urlToken}`;
      return res;
    }
  }
  
  // For internal DbGate API calls, use localStorage token
  const accessToken = localStorage.getItem(isOneOfPage('admin', 'admin-license') ? 'adminAccessToken' : 'accessToken');
  if (accessToken) {
    res['Authorization'] = `Bearer ${accessToken}`;
  }
  
  // Always include URL token as custom header for potential database connection loading
  const urlToken = getAuthToken();
  if (urlToken) {
    res['X-Url-Token'] = urlToken;
  }
  
  // if (isAdminPage()) {
  //   res['x-is-admin-page'] = 'true';
  // }
  return res;
}
