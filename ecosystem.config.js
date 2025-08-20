module.exports = {
  apps: [
    {
      name: 'uni-x-backend',
      script: 'dist/backend/backend.js',
      cwd: 'dist/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://feature-mongo-db.uni-x-visualiser.pages.dev'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://feature-mongo-db.uni-x-visualiser.pages.dev'
      },
      // Logging configuration
      log_file: '/var/log/uni-x-backend/combined.log',
      out_file: '/var/log/uni-x-backend/out.log',
      error_file: '/var/log/uni-x-backend/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Wait ready
      wait_ready: true,
      listen_timeout: 8000,
      
      // Merge logs
      merge_logs: true,
      
      // Source map support
      source_map_support: true,
      
      // Node options
      node_args: '--max-old-space-size=1024'
    },
    {
      name: 'bulk-enrichment',
      script: 'dist/scripts/bulkEnrichment.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://feature-mongo-db.uni-x-visualiser.pages.dev'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};