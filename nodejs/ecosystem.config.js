/**
 * PM2 Ecosystem Configuration untuk iPray Application
 * Usage: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'ipray-kiosk',
    script: 'main.js',
    cwd: __dirname,
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      PROD_MODE: 'true'  // Production mode - data dari process.cwd()/data
    },
    
    // Instance configuration
    instances: 1, // Single instance sudah cukup untuk Raspberry Pi
    exec_mode: 'fork', // Fork mode (bukan cluster untuk single instance)
    
    // Auto-restart configuration
    autorestart: true,
    watch: false, // Disable watch untuk production
    max_memory_restart: '500M', // Auto-restart jika memory melebihi 500MB
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
    // Log rotation — elak fail log membesar tanpa kawalan
    // Pasang: pm2 install pm2-logrotate
    // Atau guna cron_restart di atas (log dikosongkan semasa restart)
    max_size: '20M',   // rotate bila log cecah 20MB
    retain: 7,         // simpan log 7 hari lepas
    
    // Restart automatik pada 12:05 AM setiap malam untuk bersihkan memory dan rotate log
    // (12:05 bukan tepat tengah malam — bagi masa React selesai reload midnight dulu)
    cron_restart: '5 0 * * *',

    // Advanced PM2 features
    min_uptime: '10s', // Minimum uptime sebelum consider sebagai stable
    max_restarts: 10, // Maximum restarts dalam 1 minit
    restart_delay: 4000, // Delay sebelum restart (4 seconds)
    
    // Process management (selari dengan main.js SHUTDOWN_TIMEOUT_MS)
    kill_timeout: 3000, // Timeout sebelum PM2 hantar SIGKILL (3 seconds)
    listen_timeout: 10000, // Timeout untuk listen (10 seconds)
    shutdown_with_message: true,
    
    // Monitoring
    pmx: true, // Enable PM2 monitoring
  }]
};
