/**
 * PM2: cwd + explicit .env path so the Nuxt server reads the intended AWS stage variables.
 * From repository root: pm2 delete pxm && pm2 start frontend/ecosystem.config.cjs
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
