
const path = require("path");
const fs = require("fs");

const rootDir = __dirname;
const logsDir = path.join(rootDir, "logs");

// Ensure the log directory exists before PM2 opens the out/error files.
// On a fresh clone (e.g. Railway) logs/ is gitignored and won't be present.
fs.mkdirSync(logsDir, { recursive: true });

module.exports = {
  apps: [
    {
      name: "qms-api",
      cwd: rootDir,
      script: "dist/bin/server.js",
      interpreter: "node",

      // Non-secret environment switches only. All secrets (DB_URI, JWT, AWS,
      // Google Maps, etc.) are loaded from .env via dotenv — never put them here
      // since this file is git-tracked.
      env: {
        APP_ENV: "production",
      },

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,

      kill_timeout: 10000,

      time: true,
      merge_logs: true,

      out_file: path.join(logsDir, "api-out.log"),
      error_file: path.join(logsDir, "api-error.log"),
    },

    {
      name: "qms-worker",
      cwd: rootDir,
      script: "dist/bin/worker.js",
      interpreter: "node",

      // Non-secret environment switches only. All secrets (DB_URI, JWT, AWS,
      // Google Maps, etc.) are loaded from .env via dotenv — never put them here
      // since this file is git-tracked.
      env: {
        APP_ENV: "production",
      },

      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 3000,

      kill_timeout: 15000,

      time: true,
      merge_logs: true,

      out_file: path.join(logsDir, "worker-out.log"),
      error_file: path.join(logsDir, "worker-error.log"),
    },
  ],
};
