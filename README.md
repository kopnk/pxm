# PXM

PXM adalah aplikasi fullstack Nuxt 4 untuk manajemen project, progress, financial, dokumen, user, RLS, dan audit di atas layanan backend AWS.

## Struktur Source

- `pages`, `components`, `composables`, `stores`: UI dan state aplikasi.
- `server/api`, `server/middleware`, `server/utils`: API dan domain backend.
- `lib`, `utils`, `types`: kode bersama dan deklarasi tipe.
- `infra`: definisi AWS CDK; source Lambda tetap berasal dari `server/api`.
- `scripts/checks`, `scripts/dev`: build, validasi, dan tooling lokal.

Folder `.nuxt*`, `.output*`, `cdk.out`, `.cdk.out-verify`, dan `dist` adalah
artefak generated yang dapat dihapus dan akan dibuat kembali oleh perintah
build/deploy. `node_modules` adalah dependency lokal dan dapat dibuat ulang
dengan `npm install`.

## Dev Lokal

Jalankan mode lokal biasa:

```bash
npm install
cp .env.example .env
npm run dev
```

Jalankan mode lokal yang mengikuti pola stage `dev`:

```bash
npm run dev:stage:dev
```

Mode ini menjalankan:

- UI di `http://localhost:3000`
- API proxy di `http://localhost:3001`

Isi `.env` dengan nilai yang sesuai. Jangan pernah commit `.env`.

## Operasional Dev

Perintah CDK yang paling sering dipakai:

```bash
npm run cdk:synth:dev
npm run cdk:deploy:dev
npm run cdk:api:dev
```

Setelah deploy, output stack disimpan di `.cdk-outputs/dev.json`.

## Produksi

```bash
git pull origin main
npm install
npm run build
pm2 delete pxm || true
pm2 start ecosystem.config.cjs
pm2 save
```

Pemeriksaan health:

```bash
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS http://127.0.0.1:3000/api/ready
```

## Catatan Runtime

- Gunakan HTTPS di production dan set `SESSION_COOKIE_SECURE=true`.
- Arahkan app hanya ke resource AWS yang sesuai stage (`PXM_STAGE`, DynamoDB table, Cognito client, S3 bucket, dan CloudFront domain).
- Set `AWS_AUTH_COOKIE_SECRET` untuk cookie `pxm_session` berbasis Cognito sebelum mengaktifkan route auth AWS.
- Set `AWS_DEFAULT_USER_PASSWORD` di environment server untuk alur bootstrap user, signup, dan reset password.
- Gunakan `/api/ready` untuk readiness check sebelum traffic dipindahkan.

## AWS CDK Infrastructure

Stack AWS ada di [infra/README.md](D:/NUXT/pxm/infra/README.md) dan membuat resource `dev` dan `prod` yang terpisah untuk:

- DynamoDB single-table
- Cognito user pool and client
- SES identity
- Lambda + API Gateway
- S3 buckets
- CloudFront distributions

Perintah:

```bash
npm run cdk:synth:dev
npm run cdk:synth:prod
npm run cdk:deploy:dev
npm run cdk:deploy:prod
npm run cdk:api:dev
npm run cdk:api:prod
```

Setelah setiap deploy, CDK menyimpan output ke `.cdk-outputs/<stage>.json`. Gunakan `npm run cdk:api:dev` atau `npm run cdk:api:prod` untuk mencetak API base URL langsung untuk stage tersebut.
Pembaca output sekarang hanya memakai konvensi nama stack aktif: `PxmStack-dev` dan `PxmStack-prod`.

## Dokumen

- [infra/README.md](D:/NUXT/pxm/infra/README.md): AWS CDK dan resource per stage
- [docs/memahami-kodebase-pxm.md](D:/NUXT/pxm/docs/memahami-kodebase-pxm.md): peta teknis codebase
- [docs/penjelasan-dashboard-manajemen.md](D:/NUXT/pxm/docs/penjelasan-dashboard-manajemen.md): penjelasan dashboard untuk manajemen
