const crypto = require('crypto');

/**
 * Security Service
 * Menguruskan access token dan security checks untuk Electron app
 */

class SecurityService {
  constructor() {
    // Generate random access token untuk security
    this.ACCESS_TOKEN = crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get current access token
   */
  getAccessToken() {
    return this.ACCESS_TOKEN;
  }

  /**
   * Validate request dari browser
   * Block access dari browser biasa - hanya allow Electron
   */
  validateRequest(req) {
    const userAgent = req.headers['user-agent'] || '';
    const token = req.headers['x-access-token'] || '';
    
    // Check 1: Must have valid token ATAU
    // Check 2: Must be from Electron (user-agent contains 'Electron')
    const isElectron = userAgent.includes('Electron');
    const hasValidToken = token === this.ACCESS_TOKEN;
    
    return isElectron || hasValidToken;
  }
}

// Export singleton instance
const securityService = new SecurityService();
module.exports = securityService;
