
const path = require("path");

const rootDir = __dirname;
const logsDir = path.join(rootDir, "logs");

module.exports = {
  apps: [
    {
      name: "qms-api",
      cwd: rootDir,
      script: "dist/bin/server.js",
      interpreter: "node",

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
