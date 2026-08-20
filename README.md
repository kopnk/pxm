# PXM

PXM dipisahkan menjadi dua package independen agar source aplikasi dan tooling
deployment tidak saling tumpang tindih.

## Struktur

| Folder | Pemilik | Isi |
|---|---|---|
| `frontend/` | Nuxt 4 | UI SPA, Nitro API, runtime AWS SDK, test, dan script build/dev |
| `infrastructure/` | AWS CDK | Definisi resource AWS, konfigurasi stage, dan script deploy/output |
| `docs/` | Bersama | Dokumentasi arsitektur dan domain |

Root hanya menyediakan shortcut perintah. Tidak ada dependency aplikasi atau
CDK pada `package.json` root.

## Instalasi

```bash
npm run install:all
```

Perintah tersebut memasang dependency secara independen ke `frontend/` dan
`infrastructure/`. Untuk instalasi selektif:

```bash
npm --prefix frontend install
npm --prefix infrastructure install
```

Salin `frontend/.env.example` menjadi `frontend/.env`, lalu isi nilainya.

## Aplikasi Nuxt

Shortcut root tetap tersedia:

```bash
npm run dev
npm run build
npm run test
npm run typecheck
```

Perintah langsung dari package frontend juga dapat digunakan:

```bash
npm --prefix frontend run dev
```

Mode dev menjalankan UI pada `http://localhost:3000` dan API proxy pada
`http://localhost:3001`.

## AWS CDK

```bash
npm run cdk:synth:dev
npm run cdk:deploy:dev
npm run cdk:api:dev
```

CDK membangun Lambda melalui package frontend, kemudian hanya membaca artefak
`frontend/.output-lambda/server`. Source Nuxt tidak diduplikasi ke package CDK.

Dokumentasi rinci tersedia di `infrastructure/README.md` dan
`docs/memahami-kodebase-pxm.md`.

## Produksi Nuxt/PM2

```bash
npm --prefix frontend install
npm --prefix frontend run build
pm2 delete pxm || true
pm2 start frontend/ecosystem.config.cjs
pm2 save
```
