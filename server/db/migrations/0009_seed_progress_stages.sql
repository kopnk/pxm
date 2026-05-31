INSERT INTO "progress_stage" (
  "code",
  "name",
  "stage_type",
  "sequence",
  "is_required",
  "is_active"
)
VALUES
  ('caf', 'CAF', 'document', 1, false, true),
  ('permit', 'PERMIT', 'document', 2, true, true),
  ('rfi', 'RFI', 'field', 3, true, true),
  ('tagging', 'TAGGING', 'document', 4, true, true),
  ('atp', 'ATP', 'document', 5, true, true),
  ('endorse', 'ENDORSE', 'admin', 6, true, true),
  ('delay', 'DELAY', 'admin', 7, false, true),
  ('baut', 'BAUT', 'document', 8, true, true),
  ('bast', 'BAST', 'document', 9, true, true),
  ('so_delivery', 'SO DELIVERY', 'admin', 10, true, true),
  ('invoice', 'INVOICE', 'document', 11, true, true),
  ('paid', 'PAID', 'admin', 12, true, true),
  ('accrued', 'ACCRUED', 'admin', 13, false, true)
ON CONFLICT ("code")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "stage_type" = EXCLUDED."stage_type",
  "sequence" = EXCLUDED."sequence",
  "is_required" = EXCLUDED."is_required",
  "is_active" = EXCLUDED."is_active",
  "updated_at" = now();
