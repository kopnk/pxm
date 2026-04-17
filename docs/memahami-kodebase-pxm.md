# Memahami Kodebase PXM (Nuxt 4 Fullstack)

Dokumen ini adalah peta teknis PXM agar Anda bisa cepat paham:
- struktur folder,
- alur data dari UI sampai database,
- pola coding yang wajib diikuti,
- dan cara tracing bug/fitur tanpa tersesat.

---

## 1) Gambaran Arsitektur Singkat

PXM memakai pola **Frontend SPA + API internal Nuxt (Nitro) + PostgreSQL**.

| Lapisan | Lokasi | Peran |
|---|---|---|
| Frontend UI | `pages/`, `components/` | Menampilkan list, form, dashboard, filter, chart |
| Business logic client | `composables/` | Tempat API call, mapping data, helper form/list |
| State | `stores/` | Menyimpan state saja (tanpa logic berat/API) |
| API server | `server/api/` | Validasi, otorisasi, query DB, response standar |
| Middleware server | `server/middleware/auth.ts` | Memastikan request `/api/*` valid session |
| Data access/schema | `server/db/schema/`, `server/db/index.ts` | Definisi tabel dan koneksi Drizzle |
| Validasi input | `server/validation/*.schema.ts` | Semua body endpoint pakai Zod |
| Utility server | `server/utils/` | response wrapper, role check, pagination, audit, waktu |

**Stack utama:** Nuxt 4, TypeScript, Pinia, PostgreSQL, Drizzle ORM, Lucia Auth, Zod.

---

## 2) Alur Data End-to-End (Wajib Dipahami)

Alur normal untuk halaman CRUD:

1. User buka halaman di `pages/...`.
2. Halaman memanggil composable (`useXxxApi`) untuk fetch/submit data.
3. Composable melakukan request ke endpoint `server/api/...`.
4. `server/middleware/auth.ts` memvalidasi session untuk endpoint terproteksi.
5. Handler endpoint:
   - cek role (`requireRole`),
   - validasi input (Zod + `parseBody`),
   - operasi DB (Drizzle),
   - catat audit (untuk aksi penting),
   - balikan `successResponse`/`errorResponse`.
6. Composable menerima response, update store (via setter), UI otomatis re-render.

Inti yang perlu diingat: **komponen UI tidak menampung logika berat**, semua dipindah ke composable.

---

## 3) Struktur Folder yang Paling Sering Dipakai

### Root penting

| Path | Fungsi |
|---|---|
| `nuxt.config.ts` | Konfigurasi global Nuxt (termasuk mode SPA `ssr: false`) |
| `app.vue` | Root app, layout frame utama, mount global component |
| `assets/scss/main.scss` | SCSS utama + utility class visual |
| `utils/apiFetch.ts` | Wrapper request agar pola API konsisten |

### Frontend

| Path | Fungsi |
|---|---|
| `pages/` | File-based routing (`index.vue`, `create.vue`, `update.vue`, dll.) |
| `components/` | Komponen presentational reusable (`Header`, `AppToast`, form shell) |
| `composables/` | Logic API/form/list/dashboard |
| `stores/` | State Pinia untuk domain (projects, clients, users, profile, dst.) |
| `middleware/` | Guard route frontend (contoh: auth global) |

### Backend

| Path | Fungsi |
|---|---|
| `server/api/` | Endpoint REST internal Nuxt |
| `server/db/schema/` | Definisi tabel per domain |
| `server/db/migrations/` | SQL migrasi DB |
| `server/validation/` | Zod schema input endpoint |
| `server/utils/` | Helper lintas endpoint (response, audit, pagination, datetime) |

---

## 4) Pola Frontend yang Dipakai di PXM

### 4.1 Halaman (`pages/`)
- `index.vue` umumnya list/table + filter + pagination.
- `create.vue` dan `update.vue` memakai form reusable.
- Route dinamis seperti `pages/users/[id].vue` untuk detail by param.

### 4.2 Komponen (`components/`)
- Fokus ke presentasi.
- Contoh:
  - `components/AppToast.vue` untuk feedback sukses/gagal.
  - `components/form/FormShell.vue` untuk struktur form konsisten.
  - `components/form/FormSection.vue` untuk grouping field.

### 4.3 Composable (`composables/`)
Domain utama sudah dipisah rapi:
- Master/operasional: `useProjectsApi.ts`, `useClientsApi.ts`, `usePartnersApi.ts`, `useDcnApi.ts`, `useRegionsApi.ts`, `useProgressStageApi.ts`.
- Detail domain: `useProjectDetailsApi.ts`, `useProjectProgressApi.ts`, `useProjectFinancialsApi.ts`, `useProjectFilesApi.ts`.
- Halaman: `useProjectsListPage.ts`, `useProjectDetailsListPage.ts`, `useProjectFinancialsListPage.ts`.
- Form handler: `useFormHandler.ts`, `useProjectForm.ts`, `useProjectDetailForm.ts`, `useProjectFinancialForm.ts`.
- Auth/profile/user: `useUsersApi.ts`, `useProfileApi.ts`.
- Notifikasi/akses: `useNotify.ts`, `useToastMessages.ts`, `useListPagePermissions.ts`.

---

## 5) Pola Backend Endpoint (Standar Tim)

### 5.1 Penamaan file endpoint

| Nama file | Method | Contoh route |
|---|---|---|
| `index.get.ts` | GET list | `/api/projects` |
| `index.post.ts` | POST create | `/api/projects` |
| `[id].get.ts` | GET detail | `/api/projects/:id` |
| `[id].put.ts` | PUT update | `/api/projects/:id` |
| `[id].delete.ts` | DELETE | `/api/projects/:id` |

### 5.2 Urutan write endpoint (create/update/delete)

1. `requireRole(...)` (jika endpoint terproteksi role tertentu).
2. `parseBody(...)` pakai Zod schema.
3. DB operation (opsional transaction).
4. Audit log untuk aksi penting.
5. `successResponse(...)` (atau `errorResponse(...)` kalau gagal).

### 5.3 Urutan get endpoint

- Wajib dukung pagination (`page`, `limit`).
- Dukung filtering jika data list.
- Gunakan helper `buildPagination` dan `buildTotalPages`.
- Balas dalam format response standar.

---

## 6) State Management (Pinia) di Proyek Ini

Prinsip penting:
- Store = **state container**, bukan service layer.
- API call + mapping data dilakukan di composable.
- Store diisi lewat setter (`setItems`, `setMeta`, `setLoading`, dst.).

Store domain yang tersedia meliputi:
- auth/profile/users,
- projects/clients/partners/dcn/regions,
- projectDetails/projectProgress/projectFinancials,
- progressStage/notifications.

---

## 7) Dashboard: Cara Kerja Tingkat Kode

Dashboard utama ada di `pages/index.vue`.

Yang dilakukan halaman ini:
1. Ambil data gabungan dari beberapa endpoint (`projects`, `project_details`, `project_progress`, `project_financials`).
2. Terapkan filter keyword + region + sub region.
3. Hitung KPI turunan (CPI, SPI, PV, EV, AC, progress site).
4. Bangun seri 8 minggu terakhir untuk chart.
5. Render 3 chart utama + summary panel.

Catatan penting:
- Kalkulasi chart dilakukan di fungsi `rebuildSeries()`.
- Data diproses kumulatif per minggu.
- Budget baseline prioritas dari subtotal project (dengan fallback aman).

---

## 8) Database & Migrasi

### 8.1 Schema
- Setiap domain punya file schema sendiri di `server/db/schema/`.
- `server/db/schema/index.ts` menjadi penggabung export schema.

### 8.2 Migrasi
- SQL migrasi ada di `server/db/migrations/`.
- Snapshot metadata ada di `server/db/migrations/meta/`.
- Saat ada perubahan tabel:
  1. ubah schema,
  2. generate migrasi,
  3. jalankan migrasi,
  4. sinkronkan validation + endpoint + composable + UI.

---

## 9) Auth, Security, dan Validasi

- Auth session menggunakan cookie (Lucia).
- Middleware server menjaga endpoint `/api/*` yang butuh login.
- Input endpoint **wajib** tervalidasi Zod.
- Role sensitif dicek via `requireRole`.
- Response endpoint wajib format standar (`successResponse`/`errorResponse`).
- Timestamp DB mengikuti helper `dbTime()` (bukan `new Date()` untuk kolom DB).

---

## 10) Jalur Belajar Paling Efektif (Untuk Pemahaman Cepat)

Urutan baca yang direkomendasikan:

1. `nuxt.config.ts` dan `app.vue` untuk konteks global app.
2. Login flow:
   - `pages/auth/signin.vue`
   - `server/api/auth/login.post.ts`
   - `server/middleware/auth.ts`
3. Satu CRUD lengkap, misalnya Clients:
   - `pages/clients/index.vue`
   - `composables/useClientsApi.ts`
   - `stores/clients.ts`
   - `server/api/clients/index.get.ts`
4. Dashboard:
   - `pages/index.vue`
5. Database:
   - `server/db/schema/projects.ts` dan schema domain terkait.

---

## 11) Cara Menambah Fitur Baru (Checklist Praktis)

1. Definisikan kebutuhan data (kolom baru atau tabel baru).
2. Update schema di `server/db/schema/` + generate migrasi.
3. Update `server/validation/` untuk body request.
4. Tambah/ubah endpoint `server/api/...`.
5. Tambah/ubah composable `useXxxApi.ts`.
6. Update store jika perlu state baru.
7. Update halaman/komponen.
8. Pastikan toast, loading, error handling, dan pagination tetap konsisten.

---

## 12) Glossary Singkat (Biar Tidak Bingung Istilah)

- **Project**: data kontrak utama.
- **Project Detail**: item/line/scope pekerjaan per project.
- **Project Progress**: status tanggal plan vs actual per stage.
- **Project Financial**: catatan arus biaya/tagihan operasional.
- **CPI**: efisiensi biaya (EV dibanding AC).
- **SPI**: ketepatan jadwal (EV dibanding PV).
- **PV/EV/AC**: komponen dasar Earned Value Management.

---

## 13) Prinsip Implementasi yang Selalu Dijaga

- Sederhana, aman, konsisten dengan pola yang sudah ada.
- Hindari duplikasi logika (ekstrak ke composable/helper).
- UI fokus presentasi, logic fokus di composable/server util.
- Jangan menambah endpoint/path/schema secara asumsi.

---

Dokumen ini ditulis untuk kondisi struktur kode saat ini. Jika ada modul baru, tambahkan ke bagian yang relevan agar tetap menjadi peta utama tim.
