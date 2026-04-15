# Penjelasan Dashboard PMS untuk Manajemen

Dokumen ini menjelaskan dashboard di halaman `pages/index.vue` dengan bahasa non-teknis tapi tetap akurat ke implementasi script saat ini.

Tujuan utamanya: **membantu manajemen membaca kesehatan proyek secara cepat** dari sisi biaya, jadwal, dan momentum eksekusi.

---

## 1) Pertanyaan Bisnis yang Dijawab Dashboard

Dashboard dirancang untuk menjawab 4 pertanyaan inti:

1. Berapa banyak proyek aktif yang sedang terpantau?
2. Apakah progres aktual mengikuti rencana?
3. Apakah biaya aktual masih efisien terhadap hasil kerja?
4. Apakah status keseluruhan masih aman (On Track) atau mulai berisiko (At Risk)?

---

## 2) Data yang Dipakai Dashboard

Saat tombol `Refresh` ditekan, dashboard mengambil data dari 4 endpoint:

- `/api/projects`
- `/api/project_details`
- `/api/project_progress`
- `/api/project_financials`

Data ditarik per halaman sampai habis (paginated fetch all), lalu diproses di client untuk membentuk KPI dan grafik mingguan.

---

## 3) Filter Dashboard dan Dampaknya

Filter yang tersedia:

- **Project / PO keyword**
- **Region**
- **Sub Region**

Begitu filter berubah, dashboard menghitung ulang seluruh metrik. Artinya angka kartu atas, chart, dan panel summary selalu mengacu ke **dataset terfilter**, bukan total global.

---

## 4) Ringkasan Kartu Atas (Summary Cards)

### Projects
Jumlah project yang lolos filter aktif.

### Details
Jumlah detail/scope item yang lolos filter aktif.

### Progress Site
Jumlah site/detail yang sudah memiliki jejak aktual secara kumulatif pada timeline.

### PO Price + Omzet
- **PO Price (Incl Tax)**: tampilan nilai kontrak termasuk pajak untuk konteks komersial.
- **Omzet (Excl PPN)**: nilai realisasi net dari data finansial tanpa komponen PPN.

Interpretasi praktis:
- PO Price memberi gambaran target nilai kontrak.
- Omzet memberi gambaran realisasi nilai yang sudah terbentuk.

---

## 5) KPI Inti di Panel Project Summary

Panel ini menampilkan:

- `CPI (EV/AC)`
- `SPI (EV/PV)`
- `PV (Budget x Plan%)`
- `EV (Budget x Actual%)`
- `AC (Qty x Unit Price Partner)`

Status otomatis:

- **Project On Track** jika `CPI >= 1` dan `SPI >= 1`
- **Project At Risk** jika salah satu di bawah 1

---

## 6) Arti KPI (Bahasa Manajemen)

- **PV (Planned Value)**: nilai pekerjaan yang semestinya tercapai menurut rencana waktu.
- **EV (Earned Value)**: nilai pekerjaan yang benar-benar sudah dicapai.
- **AC (Actual Cost)**: biaya aktual yang sudah keluar.
- **CPI**:
  - > 1: biaya relatif efisien,
  - = 1: sesuai target,
  - < 1: biaya cenderung tidak efisien.
- **SPI**:
  - > 1: progres lebih cepat dari rencana,
  - = 1: tepat rencana,
  - < 1: progres tertinggal.

---

## 7) Penjelasan Tiga Grafik Utama

### A. CPI & SPI Trend (Weekly)

Menampilkan perubahan indeks biaya dan jadwal per minggu.

- Sumbu X: 8 minggu terakhir.
- Sumbu Y: nilai indeks.
- Kegunaan: melihat tren membaik/memburuk, bukan hanya angka titik terakhir.

### B. Progress Site Trend (Weekly)

Menampilkan akumulasi jumlah site/detail yang mulai memiliki progres aktual.

- Kurva naik = ada penambahan progres.
- Kurva datar = tidak ada penambahan progres di periode tersebut.

### C. S-Curve (Plan vs Actual)

Membandingkan:
- **Planned %** (akumulasi rencana),
- **Actual %** (akumulasi realisasi).

Interpretasi:
- Actual di bawah plan: ada gap eksekusi.
- Actual sejajar plan: sesuai jalur.
- Actual di atas plan: eksekusi lebih cepat.

---

## 8) Cara Perhitungan Ringkas (Agar Transparan)

Dashboard membentuk seri mingguan 8 periode terakhir, lalu menghitung kumulatif:

1. Kumpulkan titik plan dan actual dari data stage progress.
2. Kumpulkan biaya aktual dari data finansial.
3. Hitung rasio plan% dan actual% kumulatif.
4. Turunkan `PV`, `EV`, `AC`.
5. Hitung `CPI = EV/AC` dan `SPI = EV/PV`.

Semua proses ini berjalan ulang setiap kali filter berubah.

---

## 9) Cara Baca Cepat Saat Meeting

Gunakan urutan ini agar diskusi fokus dan cepat:

1. Lihat status besar: **On Track** atau **At Risk**.
2. Cek `CPI` dan `SPI` angka terbaru.
3. Validasi tren di grafik CPI/SPI (apakah membaik atau menurun).
4. Lihat S-Curve untuk deviasi plan vs actual.
5. Lihat Progress Site Trend untuk menilai momentum lapangan.
6. Gunakan PO Price vs Omzet untuk konteks target vs realisasi.

---

## 10) Contoh Narasi Presentasi ke Manajemen

"Dashboard ini membaca kesehatan proyek dari dua sisi utama: efisiensi biaya (CPI) dan ketepatan jadwal (SPI). Tren mingguan memberi sinyal dini, bukan hanya snapshot hari ini. S-Curve memperlihatkan deviasi rencana terhadap realisasi, sementara progress site trend menunjukkan momentum eksekusi lapangan. Ringkasan PO Price dan Omzet membantu mengaitkan performa operasional dengan konteks nilai bisnis."

---

## 11) Batasan yang Perlu Dipahami

Untuk menghindari salah tafsir, berikut batasannya:

- Kualitas insight sangat bergantung pada kedisiplinan input progress dan finansial.
- Jika ada data terlambat diinput, KPI bisa ikut berubah.
- Dashboard ini adalah alat monitoring operasional cepat, bukan pengganti audit detail per item.

---

## 12) Catatan Implementasi (Teknis Singkat)

- Dashboard melakukan fetch paralel ke 4 modul data.
- Perhitungan dilakukan di fungsi kalkulasi seri mingguan.
- Semua metrik summary dan chart bersifat dinamis mengikuti filter aktif.
- Grafik dapat diperbesar (panel fullscreen) untuk review detail saat meeting.
