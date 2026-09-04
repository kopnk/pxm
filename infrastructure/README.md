# PXM AWS Infrastructure

Folder ini berisi infrastruktur AWS CDK untuk backend aktif PXM: auth Cognito, storage DynamoDB single-table, file app di S3, distribusi lewat CloudFront, dan identity SES bila diperlukan.

Kode handler Lambda tidak disimpan ulang di dalam `infrastructure`. Endpoint aktif berada
di `frontend/server/api`, lalu `npm run build:api:lambda` menghasilkan artefak deploy ke
`frontend/.output-lambda/server`. Dengan demikian `infrastructure` hanya berisi definisi resource
CDK dan tidak menduplikasi source API.

## Prioritas Dev

Untuk implementasi saat ini, selesaikan `dev` lebih dulu.

Alur lokal yang meniru stage:

```bash
npm run dev:stage:dev
```

Alur deploy AWS untuk `dev`:

```bash
npm run cdk:synth:dev
npm run cdk:deploy:dev
npm run cdk:api:dev
```

Project ini mengasumsikan:

- UI di `http://localhost:3000`
- API proxy di `http://localhost:3001`
- nama stack `PxmStack-dev`

## Stage

Gunakan context `stage` untuk deploy environment yang terpisah:

- `dev`: resource bisa dibongkar ulang, tanpa DynamoDB point-in-time recovery, removal policy destroy.
- `prod`: resource dipertahankan, DynamoDB point-in-time recovery aktif, deletion protection aktif.

Resource backend selalu menyertakan stage. Untuk frontend static, hanya `prod` yang memakai bucket hosting karena `dev` berjalan lewat localhost.

Origin CORS dibatasi per stage (`localhost:3000` untuk `dev` dan domain aplikasi
untuk `prod`). Cookie sesi ditandatangani dengan secret acak Secrets Manager,
bukan identifier stack. Deploy pertama setelah perubahan ini akan mengakhiri
sesi login lama karena signing secret berubah.

## Resource Stack

Stack ini membuat:

- Satu DynamoDB single table dengan `pk` + `sk` dan dua GSI generik (`gsi1`, `gsi2`).
- Cognito User Pool, web client, dan group role (`superadmin`, `admin`, `staff`).
- Private S3 bucket `pxm-frontend` untuk asset Nuxt SPA hasil build di `prod`.
- Private S3 bucket untuk file aplikasi seperti dokumen project dan avatar.
- CloudFront distribution untuk SPA di `prod`.
- CloudFront distribution untuk file aplikasi.
- SES email identity opsional saat context `sesIdentityEmail` diberikan.

Bucket frontend dan file pada `prod` memakai retention policy. Penghapusan stack
tidak otomatis menghapus isi bucket produksi.

## Perintah

```bash
npm run cdk:synth:dev
npm run cdk:deploy:dev

npm run cdk:synth:prod
npm run cdk:deploy:prod
```

Padanan npm script:

```bash
npm run cdk:synth:dev
npm run cdk:deploy:dev
npm run cdk:api:dev

npm run cdk:synth:prod
npm run cdk:deploy:prod
npm run cdk:api:prod
```

`npm run cdk:api:dev` dan `npm run cdk:api:prod` akan mencetak API Gateway base URL langsung dari output CDK yang tersimpan.

Script synth/deploy melakukan validasi template sebelum melanjutkan dan menolak
wildcard CORS, cookie secret non-Secrets Manager, method health/ready yang terlalu
luas, bucket frontend prod tanpa retention, dan permission SES wildcard.

Saat deploy pertama setelah migrasi Partner PO PDF, script deploy menyalin nilai
Secrets Manager lama ke SSM SecureString `/pxm/<stage>/partner-po-pdf-secret`
sebelum CloudFormation diperbarui. Deploy dihentikan jika parameter yang sudah ada
memiliki nilai berbeda, sehingga QR/link PO lama tidak kehilangan validitas.

Context opsional:

```bash
npm --prefix infrastructure exec -- node scripts/cdk-stage.mjs deploy prod -c region=ap-southeast-1 -c sesIdentityEmail=admin@example.com
```

## Urutan Deploy

1. Deploy stack AWS untuk `dev`.
2. Build dan verifikasi app Nuxt dengan environment variable stage yang sesuai.
3. Jalankan `npm run cdk:synth:dev` dan `npm run cdk:deploy:dev`.
4. Verifikasi flow auth, upload file, report, dan audit di `dev`.
5. Setelah valid, baru deploy ke `prod`.

## File Output

Script deploy menulis output stage ke:

- `infrastructure/.cdk-outputs/dev.json`
- `infrastructure/.cdk-outputs/prod.json`

Nilai yang biasanya paling dulu dibutuhkan:

- `ApiUrl`
- `CloudFrontUrl` (`prod` saja, untuk frontend SPA)
- `DynamoTableName`
- `CognitoUserPoolId`
- `CognitoUserPoolClientId`

## Catatan Single-Table

Jangan memetakan setiap tabel SQL lama langsung menjadi item collection DynamoDB tanpa memeriksa query halaman dan report lebih dulu. Setiap query harus direpresentasikan sebagai access pattern primary key atau GSI, atau ditangani lewat read model yang terdenormalisasi.

Keluarga item yang disarankan:

- `USER#<id>` / `PROFILE`, `PERMISSIONS`
- `CLIENT#<id>` / `PROFILE`
- `PARTNER#<id>` / `PROFILE`
- `REGION#<id>` / `PROFILE`, dengan entry GSI parent/child
- `PROJECT#<id>` / `HEADER`, `DETAIL#<id>`, `PROGRESS#<id>`, `FINANCIAL#<id>`, `FILE#<id>`
- `AUDIT#<yyyy-mm>` / `<timestamp>#<id>`

Finalkan key yang tepat hanya setelah list page, filter, dan export report benar-benar sudah dipetakan.
