# PXM Nuxt Application

Package ini memiliki seluruh runtime aplikasi:

- Nuxt 4 SPA: `pages/`, `components/`, `layouts/`, dan `assets/`
- state dan logic client: `stores/`, `composables/`, `utils/`, dan `lib/`
- Nitro API: `server/api/`, `server/middleware/`, `server/utils/`
- script aplikasi: `scripts/dev/` dan `scripts/checks/`

AWS SDK di package ini adalah dependency runtime untuk Cognito, DynamoDB, S3,
dan Secrets Manager. AWS CDK tidak boleh ditambahkan ke package ini.

```bash
npm install
npm run dev
```

File environment lokal berada di `.env` dan tidak boleh di-commit.
