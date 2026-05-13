# GO_SAAS — Catatan arah SaaS untuk PXM (baca-only, tanpa perubahan kode)

Dokumen ini merangkum **apa yang perlu disesuaikan, ditambah, atau dikurangi** jika aplikasi ini dijadikan produk **SaaS multi-pelanggan**. Isinya berdasarkan pembacaan struktur proyek (frontend Nuxt SPA → Nitro API → PostgreSQL/Drizzle → Lucia Auth) pada repo ini.

---

## 1. Gambaran singkat arsitektur saat ini (baseline)

| Lapisan | Kondisi relevan untuk SaaS |
|--------|---------------------------|
| **Frontend** | Nuxt 4, `ssr: false`, halaman di `pages/`, state di Pinia, API lewat `apiFetch` + cookie session (`credentials: "include"`). Tidak ada konsep `tenantId` / workspace di URL atau header. |
| **Backend** | Nitro `server/api/*`, middleware `server/middleware/auth.ts` memvalidasi session Lucia untuk semua `/api/*` (kecuali auth & PO PDF bertanda `access`). |
| **Auth** | Lucia + cookie `pxm_session`, atribut user: `email`, `role`, `isActive`. Role dicek per endpoint via `requireRole`. |
| **Database** | Satu `DATABASE_URL`, Drizzle schema: `users`, `projects`, `project_*`, `clients`, `partners`, `regions`, `audit_log`, dll. **Tidak ada kolom organisasi/tenant** pada entitas bisnis utama. |
| **File / media** | Supabase Storage (avatar, project files) dengan service role; bucket/naming perlu strategi isolasi tenant. |
| **Audit** | `audit_log` menyimpan `actorId` + target; belum ada `tenant_id` untuk partisi data pelanggan. |

Ini pola **single-tenant / satu organisasi per deploy** (atau satu DB dipakai bersama tanpa isolasi baris per pelanggan SaaS).

---

## 2. Multi-tenancy (inti SaaS)

**Tambah / sesuaikan:**

- **Model tenant / organisasi**  
  Tabel mis. `organizations` (atau `tenants`): `id`, nama, slug, status langganan, batas pengguna, zona waktu default, metadata paket, dll.

- **Keanggotaan user ↔ organisasi**  
  Tabel `organization_members` (user_id, organization_id, role di dalam org: owner/admin/member). User global bisa punya banyak org; session atau “org aktif” harus dipilih (subdomain, path `/o/:slug`, atau header).

- **Kolom `organization_id` (atau `tenant_id`)**  
  Pada **semua** tabel data bisnis yang harus terpisah per pelanggan: `projects`, `project_details`, `project_financials`, `project_progress`, `clients`, `partners`, `regions` (jika per-tenant), `project_files`, `dcn`, `progress_stage`, dll.  
  Index komposit `(organization_id, …)` untuk query list utama.

- **Scope query di server**  
  Satu lapisan helper (mis. `requireOrganization(event)` + `eq(table.organizationId, ctx.orgId)`) dipakai di **setiap** handler GET/POST/PUT/DELETE agar tidak ada kebocoran ID antar tenant. Jangan mengandalkan UI saja.

- **Opsi isolasi kuat**  
  - *Row-level:* semua tenant satu DB + `organization_id` + policy ketat.  
  - *PostgreSQL RLS:* policy per `SET app.current_org_id` dari session.  
  - *DB/schema per tenant:* isolasi maksimal, operasi & migrasi lebih berat.

**Kurangi / hindari:**

- Asumsi “satu dunia data” tanpa filter org di join/list/export/PDF/websocket.

---

## 3. Autentikasi & otorisasi

**Tambah / sesuaikan:**

- **Role dua lapis (umum di SaaS)**  
  - *Platform:* `platform_admin` (support internal, billing read-only).  
  - *Tenant:* `owner`, `admin`, `staff` per `organization_id`.  
  Saat ini `users.role` terasa **global** (superadmin/admin/staff) — perlu dipisah atau ditafsirkan ulang per konteks org.

- **Onboarding & undangan**  
  Self-service signup org + owner, undangan email, reset password, optional MFA.

- **SSO / SAML / OIDC** (opsional, tier enterprise): provider per tenant.

- **Cookie & domain**  
  Subdomain per tenant (`acme.app.com`) mempengaruhi `SameSite`, `Secure`, dan CORS. Lucia `sessionCookie` perlu diselaraskan dengan domain produk SaaS.

**Kurangi:**

- Ketergantungan pada satu basis URL tanpa mempertimbangkan multi-domain / white-label.

---

## 4. Billing, langganan, limit

**Tambah:**

- Integrasi pembayaran (Stripe, Xendit, Midtrans, dll.): `subscriptions`, `invoices`, `payment_methods`, webhook handler.
- **Paket & limit:** jumlah user, proyek, storage, export baris, API rate — disimpan di org dan dicek sebelum aksi mahal (export besar, bulk upload).
- **Trial & suspend:** nonaktifkan org (`is_active` di org) + pesan di UI; middleware menolak API selain billing/support.

Tidak ada jejak billing di schema saat ini.

---

## 5. Frontend (Nuxt)

**Tambah / sesuaikan:**

- **Switcher organisasi** + persistensi “org aktif” (cookie/header/query).
- **Routing:** mis. `/w/:slug/...` atau subdomain; semua composable `apiFetch` kirim konteks org jika tidak memakai subdomain terpisah.
- **Branding per tenant:** logo, warna, nama aplikasi — config dari API atau subdomain.
- **Feature flags** per paket (matikan modul tidak dibayar).

**Kurangi / rapikan:**

- Hardcode URL aset publik (contoh pola di `Header.vue` untuk default avatar Supabase) — sebaiknya dari `runtimeConfig` / CDN tenant.

---

## 6. Backend (Nitro) & keamanan

**Tambah:**

- **Guard organisasi** konsisten di semua route (termasuk `reports/*`, `export-*`, `ws`).
- **Rate limiting** per IP / per org / per user (login, export, PDF).
- **Idempotency** untuk webhook pembayaran.
- **Background jobs** (queue) untuk export besar, email, PDF massal — agar tidak memblok worker HTTP.

**Sesuaikan:**

- **PDF dengan query `access`:** secret signing (`runtimeConfig.partnerPoPdfSecret`) idealnya **per tenant** atau minimal rotasi & audit akses lintas org.
- **WebSocket** (`dashboard-refresh`): channel per tenant agar event tidak bocor antar pelanggan.

---

## 7. Database & migrasi

**Tambah:**

- Migrasi Drizzle untuk `organizations`, membership, `organization_id` di seluruh tabel relevan + **backfill** untuk data existing (satu org “default” jika migrasi dari single-tenant).
- Kebijakan retention / arsip data per paket.

**Kurangi / waspada:**

- Unique global yang bentrok antar tenant (mis. email user bisa unik global atau unik per org — keputusan produk).

---

## 8. Storage (Supabase)

**Tambah / sesuaikan:**

- Prefix path atau **bucket per tenant** (`org_id/...`) + policy storage (jika memakai RLS Supabase) atau validasi path di server sebelum upload/delete.
- Kuota storage per paket.

**Kurangi:**

- Asumsi satu bucket `avatars` / project files tanpa namespace org.

---

## 9. Observability & operasi

**Tambah:**

- Logging terstruktur dengan `organization_id`, `request_id`.
- Metrics (latency, error rate) per route; tracing opsional.
- Health check + readiness untuk orchestrator (K8s, Fly.io, dll.).

---

## 10. Legal & produk

**Tambah:**

- Syarat layanan, kebijakan privasi, DPA (B2B), lokasi data (region DB).
- **Export / hapus data** per tenant (GDPR-like) dan retention audit log.

---

## 11. Ringkasan “tambah / kurangi” satu baris

| Arah | Ringkas |
|------|----------|
| **Tambah** | Organisasi/tenant, membership, `organization_id` + scope di semua API, billing & limit, onboarding/invite, rate limit, storage namespacing, observability, legal. |
| **Sesuaikan** | Auth/session multi-domain, role platform vs tenant, PDF/WS/export agar tenant-aware, konfigurasi publik tanpa hardcode. |
| **Kurangi / tekan** | Asumsi single-tenant, query tanpa filter org, unbounded export tanpa kuota paket. |

---

## 12. Catatan akhir

File ini **hanya catatan arsitektur / checklist**; tidak mengubah perilaku aplikasi. Prioritas implementasi sebaiknya: **isolasi data (tenant + scope API)** → **auth/membership** → **billing & limit** → **operasi & observability** → **white-label & fitur enterprise**.
