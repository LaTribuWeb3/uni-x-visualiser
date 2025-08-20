module.exports = {
  apps: [
    {
      name: 'uni-x-backend',
      script: 'backend.js',
      cwd: 'dist/backend',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://feature-mongo-db.uni-x-visualiser.pages.dev'
      },
      log_file: './logs/uni-x-backend/combined.log',
      out_file: './logs/uni-x-backend/out.log',
      error_file: './logs/uni-x-backend/error.log',
      time: true
    },
    {
      name: 'bulk-enrichment',
      cwd: 'dist/scripts',
      script: 'scripts/bulkEnrichment.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        FRONTEND_URL: 'https://feature-mongo-db.uni-x-visualiser.pages.dev'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_file: './logs/bulk-enrichment/combined.log',
      out_file: './logs/bulk-enrichment/out.log',
      error_file: './logs/bulk-enrichment/error.log',
      time: true
    }
  ]
};