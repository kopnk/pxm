# Memahami Kodebase PXM (AWS Runtime)

Dokumen ini adalah peta teknis PXM dalam kondisi aktif saat ini: Nuxt 4 SPA di frontend, Nitro API di backend, dan layanan data/auth/file di AWS.

## 1) Gambaran Arsitektur Singkat

PXM memakai pola **frontend SPA + API internal Nuxt (Nitro) + backend terkelola AWS**.

| Lapisan | Lokasi | Peran |
|---|---|---|
| Frontend UI | `pages/`, `components/` | Menampilkan list, form, dashboard, filter, dan chart |
| Business logic client | `composables/` | Tempat API call, mapping data, helper form/list |
| State | `stores/` | Menyimpan state saja |
| API server | `server/api/` | Validasi, otorisasi, operasi domain, response standar |
| Middleware server | `server/middleware/` | Memastikan request `/api/*` punya sesi valid |
| Data access | `server/utils/*Store.ts` | Adapter DynamoDB single-table per domain |
| Validasi input | `server/validation/*.schema.ts` | Semua body/query endpoint pakai Zod |
| Infra | `infra/` | AWS CDK untuk stage `dev` dan `prod` |

**Stack utama:** Nuxt 4, TypeScript, Pinia, Cognito, DynamoDB single-table, S3, CloudFront, SES, dan Zod.

## 2) Alur Data End-to-End

Alur normal untuk halaman CRUD:

1. User buka halaman di `pages/...`.
2. Halaman memanggil composable `useXxxApi`.
3. Composable melakukan request ke `/api/...`.
4. Middleware auth memvalidasi sesi cookie berbasis Cognito.
5. Handler endpoint:
   - cek role (`requireRole`),
   - validasi input (`parseBody` + Zod),
   - panggil store/helper domain DynamoDB,
   - tulis audit log bila perlu,
   - balikan `successResponse` atau `errorResponse`.
6. Composable menerima response, update store lewat setter, lalu UI re-render.

Prinsipnya tetap sama: **komponen UI tidak menampung logika berat**.

## 3) Struktur Folder Penting

### Root

| Path | Fungsi |
|---|---|
| `nuxt.config.ts` | Konfigurasi global Nuxt |
| `app.vue` | Root app |
| `assets/scss/main.scss` | SCSS utama + utility class visual |
| `utils/apiFetch.ts` | Wrapper request |
| `infra/` | AWS CDK stack dan konfigurasi stage |

### Frontend

| Path | Fungsi |
|---|---|
| `pages/` | File-based routing |
| `components/` | Komponen presentational reusable |
| `composables/` | Logic API/form/list/dashboard |
| `stores/` | State Pinia per domain |
| `lib/` | Helper murni + konstanta shared lintas client/server |
| `utils/` | Helper frontend ringan seperti fetch wrapper dan formatter UI/export |
| `middleware/` | Guard route frontend |

### Backend

| Path | Fungsi |
|---|---|
| `server/api/` | Endpoint REST internal Nuxt |
| `server/utils/*Store.ts` | CRUD/query DynamoDB per domain |
| `server/utils/` | Helper runtime backend: auth, response, audit, storage, PDF, query helpers |
| `server/utils/cognitoAuth.ts` | Integrasi auth ke Cognito |
| `server/utils/audit.ts` | Audit log ke DynamoDB |
| `server/validation/` | Zod schema input |

## Aturan Praktis Folder Helper

- Taruh di `lib/` bila helper itu pure, tidak tergantung browser, tidak tergantung event/request server, dan aman dipakai di dua sisi.
- Taruh di `utils/` bila helper itu khusus kebutuhan frontend seperti `apiFetch`, formatter tampilan, atau formatter export yang dipanggil dari composable/page.
- Taruh di `server/utils/` bila helper menyentuh Cognito, DynamoDB, S3, request event, response envelope, atau logic backend lain yang tidak boleh bocor ke client.

Contoh saat ini:

- `lib/pagination.ts` = aturan pagination bersama
- `utils/apiFetch.ts` = wrapper request client
- `server/utils/projectStore.ts` = akses data DynamoDB

## 4) Pola Backend Endpoint

### Write endpoint

1. `requireRole(...)`
2. `parseBody(...)`
3. operasi domain/store
4. audit log
5. `successResponse(...)`

### Get endpoint

- Wajib pagination
- Wajib support filtering bila data list
- Gunakan `buildPagination` dan `buildTotalPages`
- Jangan return object mentah

## 5) DynamoDB Single-Table

PXM tidak lagi memakai tabel SQL per domain. Semua data aplikasi hidup di satu table DynamoDB per stage.

Atribut umum:

- `pk`, `sk`
- `gsi1pk`, `gsi1sk`
- `gsi2pk`, `gsi2sk`
- `entityType`
- `stage`

Contoh keluarga item:

- `USER#<id>`
- `CLIENT#<id>`
- `PARTNER#<id>`
- `REGION#<id>`
- `PROJECT#<id>`
- `PROJECT_DETAIL#<id>`
- `PROJECT_PROGRESS#<id>`
- `PROJECT_FINANCIAL#<id>`
- `PROJECT_FILE#<id>`
- `AUDIT#<yyyy-mm>`

Kalau menambah fitur, pikirkan dulu access pattern list, filter, dan export-nya, baru tentukan key atau GSI yang cocok.

## 6) Auth, File, dan Audit

- Auth memakai Cognito, tetapi kontrak frontend tetap lewat endpoint `/api/auth/*`.
- File avatar dan file project disimpan di S3, lalu diakses lewat CloudFront.
- Metadata file tetap dicatat di DynamoDB.
- Audit log tidak lagi memakai database relasional; semuanya masuk ke DynamoDB.

## 7) Stage `dev` dan `prod`

Stage adalah konsep inti di PXM saat ini:

- `dev` untuk verifikasi dan iterasi
- `prod` untuk data hidup

Keduanya harus terpisah untuk:

- DynamoDB table
- Cognito User Pool/App Client
- S3 bucket
- CloudFront distribution
- Lambda/API Gateway

Setiap instance app hanya boleh menunjuk ke resource stage yang sama lewat env.

## 8) Jalur Baca Cepat

Urutan yang paling efektif:

1. `README.md`
2. `infra/README.md`
3. `scripts/dev/dev-stage-dev.mjs`
4. `server/api/auth/login.post.ts`
5. `server/utils/cognitoAuth.ts`
6. Salah satu alur CRUD lengkap, misalnya:
   - `pages/clients/index.vue`
   - `composables/useClientsApi.ts`
   - `stores/clients.ts`
   - `server/api/clients/index.get.ts`
   - `server/utils/clientStore.ts`
7. `server/utils/projectStore.ts` dan domain store terkait

## 9) Checklist Saat Menambah Fitur

1. Tentukan access pattern DynamoDB-nya.
2. Tambah/ubah validation di `server/validation/`.
3. Tambah/ubah store helper di `server/utils/`.
4. Tambah/ubah endpoint `server/api/...`.
5. Tambah/ubah composable `useXxxApi.ts`.
6. Update store jika hanya perlu state baru.
7. Update halaman/komponen.
8. Verifikasi pagination, audit, dan response envelope tetap konsisten.

## 10) Prinsip Implementasi

- Sederhana
- Aman
- Konsisten dengan pola repo
- Tidak menghidupkan lagi PostgreSQL, Drizzle, Lucia, atau Supabase ke jalur runtime aktif

Dokumen ini harus dijaga sinkron dengan arsitektur aktif proyek.
