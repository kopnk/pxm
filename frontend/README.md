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

## Runtime dan pembaruan keamanan

Gunakan Node.js **22.23.4+** pada cabang 22 LTS, **24.22.1+** pada cabang 24
LTS, atau **26.12.1+**. Batas tersebut mengikuti rilis keamanan Node.js
21 Oktober 2026. Instalasi global Node/PM2 dan runtime deployment perlu diperbarui
terpisah; `engines` pada package ini hanya menyatakan versi yang didukung.

Nuxt 4.6.2, Vue 3.5.44, dan Vue Router 5.2.0 dipin untuk menjaga hasil instalasi.
SheetJS 0.20.3 dipasang dari tarball resmi karena paket `xlsx` pada registry npm
masih tertahan di 0.18.5. URL dan integrity tarball disimpan di lockfile.
Gunakan `npm ci` agar versi yang diuji tetap sama.

Sumber resmi:

- [Rilis keamanan Node.js](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Instalasi SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)

Audit pada 22 Oktober 2026 turun dari 26 temuan (3 critical) menjadi 9 high,
tanpa critical. Sembilan entri tersebut berasal dari dua advisory pada dependency
transitif Nitro: `braces` 3.0.3 dan `node-forge` 1.4.0. Jangan menjalankan
`npm audit fix --force` tanpa review: saran saat audit justru menurunkan Nuxt ke
4.1.3. Dependency tersebut dipakai oleh tooling pemindaian file dan server dev
Nitro. Keduanya tidak ditemukan dalam paket runtime Lambda hasil build yang diuji;
periksa kembali paket hasil build setiap pembaruan. Kedua advisory belum memiliki
versi patch saat diperiksa. Audit tooling belum bersih.

- [Advisory braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
- [Advisory node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv)

## Pemeriksaan desktop dan PWA

Jalankan `npm run lint`, `npm test`, `npm run typecheck`, `npm run build`,
`npm run build:api:lambda`, dan `npm run generate` sebelum deployment.
`npm test` mencakup pemeriksaan route/RLS dan regresi PWA: data privat tidak
disimpan offline, fallback offline, kegagalan kuota, isolasi cache, dan versi cache.

Semua mode build mengganti versi service worker dengan ID build Nuxt menggunakan
helper yang sama. API memakai `Cache-Control: no-store`; hanya aset publik
`/_nuxt/` yang boleh disimpan oleh service worker. Halaman offline menyediakan
tombol coba lagi, tanpa menampilkan ulang halaman akun yang pernah dikunjungi.
