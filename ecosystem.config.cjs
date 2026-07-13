/**
 * PM2: cwd + explicit .env path so the Nuxt server reads the intended AWS stage variables.
 * Always: pm2 delete pxm && pm2 start ecosystem.config.cjs  (restart alone keeps old flags)
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "pxm",
      cwd: __dirname,
      script: ".output/server/index.mjs",
      interpreter: "node",
      node_args: "-r dotenv/config",
      env: {
        DOTENV_CONFIG_PATH: path.join(__dirname, ".env"),
      },
    },
  ],
};
