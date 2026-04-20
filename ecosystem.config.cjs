/**
 * PM2: set cwd to repo root so `dotenv/config` loads `.env`, and DATABASE_URL is a string for `pg`.
 * Usage (from repo root, after `npm run build`):
 *   pm2 delete pxm
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "pxm",
      cwd: __dirname,
      script: ".output/server/index.mjs",
      interpreter: "node",
      node_args: "-r dotenv/config",
    },
  ],
};
