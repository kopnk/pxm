import { z } from "zod";
import { DEFAULT_PAGE_LIMIT } from "~/lib/pagination";

const optStr = z.string().optional().nullable();
const optUuid = z.string().uuid().optional().nullable();
const optNum = z.number().optional().nullable();
const optPercent = z.number().min(0).max(100).optional().nullable();

const validatePartnerInstallment = (
  val: {
    partnerInstallment?: string | null;
    partnerInstallmentPercent?: number | null;
  },
  ctx: z.RefinementCtx,
) => {
  if (
    val.partnerInstallment &&
    !(typeof val.partnerInstallmentPercent === "number" && val.partnerInstallmentPercent > 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "partnerInstallmentPercent is required and must be greater than 0 when partnerInstallment is selected",
      path: ["partnerInstallmentPercent"],
    });
  }
};

export const financialStatusZ = z.enum([
  "draft",
  "issued",
  "approved",
  "paid",
  "cancelled",
]);

const projectFinancialSchemaBase = z.object({
  projectId: z.string().uuid(),
  projectDetailId: z.string().uuid(),

  projectProgressId: optUuid,

  balapId: optUuid,
  bastId: optUuid,
  balapNumber: optStr,
  balapDate: z.string().optional().nullable(),

  flowDirection: z.enum(["in", "out"]),

  status: financialStatusZ.optional(),

  docType: optStr,
  docNumber: optStr,
  docDate: z.string().optional().nullable(),

  vbNumber: optStr,
  vbDate: z.string().optional().nullable(),
  mcmNumber: optStr,
  mcmDate: z.string().optional().nullable(),
  paidNumber: optStr,
  paidDate: z.string().optional().nullable(),

  taxIn: optNum,
  taxOut: optNum,
  pph: optNum,
  note: optStr,
  stage: z.number().int().min(1).optional().nullable(),

  clientId: optUuid,
  partnerId: optUuid,

  bastNumber: optStr,
  bastDate: z.string().optional().nullable(),

  poNumberPartner: optStr,
  poDatePartner: z.string().optional().nullable(),

  invoiceNumberPartner: optStr,
  invoiceDatePartner: z.string().optional().nullable(),

  fpNumberPartner: optStr,
  fpDatePartner: z.string().optional().nullable(),

  qtyPartner: optNum,
  unitPricePartner: optNum,
  partnerInstallment: z
    .enum([
      "1st",
      "2nd",
      "3rd",
      "Final",
    ])
    .optional()
    .nullable(),
  partnerInstallmentPercent: optPercent,
  // Optional redaction override for partner BAST and invoice PDFs only.
  partnerDocumentWorkLocation: optStr,
  kopindosatSignatoryName: optStr,
  kopindosatSignatoryTitle: optStr,

  poNumberClient: optStr,
  poDateClient: z.string().optional().nullable(),

  invoiceNumberClient: optStr,
  invoiceDateClient: z.string().optional().nullable(),

  fpNumberClient: optStr,
  fpDateClient: z.string().optional().nullable(),

  qtyClient: optNum,
  unitPriceClient: optNum,
});

export const createProjectFinancialSchema = projectFinancialSchemaBase.superRefine((val, ctx) => {
  if (val.flowDirection === "in" && !val.partnerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "partnerId is required for flowDirection=in",
      path: ["partnerId"],
    });
  }

  if (val.flowDirection === "out" && !val.clientId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "clientId is required for flowDirection=out",
      path: ["clientId"],
    });
  }

  validatePartnerInstallment(val, ctx);
});

export const createProjectFinancialBulkSchema = z.union([
  createProjectFinancialSchema,
  z.array(createProjectFinancialSchema).min(1).max(50),
]);

export const updateProjectFinancialSchema =
  projectFinancialSchemaBase.partial().superRefine(validatePartnerInstallment);

/** Query `GET /api/project_financials/export` (search, status, flow, pagination; merge per project detail). */
export const projectFinancialsExportQueryZ = z.object({
  search: z.string().max(500).optional(),
  material: z.string().max(500).optional(),
  status: financialStatusZ.optional(),
  flowDirection: z.enum(["in", "out"]).optional(),
  projectId: z.string().uuid().optional(),
  projectDetailId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  subRegionId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(500).optional().default(DEFAULT_PAGE_LIMIT),
});

/** Query export tax-in / tax-out / pph (search + status + pagination; flow via section SQL). */
export const projectFinancialsTaxSectionExportQueryZ =
  projectFinancialsExportQueryZ.pick({
    search: true,
    material: true,
    status: true,
    regionId: true,
    subRegionId: true,
    page: true,
    limit: true,
  });
