module.exports = {
  apps: [{
    name: 'ccem-server',
    script: 'index.js',
    instances: 1,
    autorestart: true,
    watch: ['keys.json', 'environments.json'],
    watch_delay: 1000,
    ignore_watch: ['node_modules', '.secret', '*.log'],
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 13333,
      HOST: '127.0.0.1'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true
  }]
};
