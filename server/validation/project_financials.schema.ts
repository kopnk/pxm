import { z } from "zod";

const optStr = z.string().optional().nullable();
const optUuid = z.string().uuid().optional().nullable();
const optNum = z.number().optional().nullable();

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
});

export const updateProjectFinancialSchema =
  projectFinancialSchemaBase.partial();
