// TokenService.js
// General service to handle token passed from parent iframe

class TokenService {
  constructor() {
    this.token = null;
    this._initListener();
  }

  _initListener() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.token) {
        this.setToken(event.data.token);
      }
    });
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  getToken() {
    return this.token || localStorage.getItem('accessToken');
  }
}

const tokenService = new TokenService();
export default tokenService;
