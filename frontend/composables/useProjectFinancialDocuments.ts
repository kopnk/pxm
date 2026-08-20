import {
  PROJECT_FILE_REF_TABLE,
  saveRefDocuments,
  type RefDocFiles,
  type RefDocUrls,
} from "@/composables/useProjectRefDocuments";

export const FINANCIAL_DOC_CATEGORIES = [
  "partner_po",
  "partner_invoice",
  "partner_tax",
  "balap",
  "bast",
  "client_po",
  "client_invoice",
  "client_tax",
] as const;

export type FinancialDocCategory = (typeof FINANCIAL_DOC_CATEGORIES)[number];

export const financialDocCategories = (): string[] => [
  ...FINANCIAL_DOC_CATEGORIES,
];

export const saveFinancialDocuments = async (
  api: Parameters<typeof saveRefDocuments>[0],
  refId: string,
  files: RefDocFiles,
  urls: RefDocUrls,
) =>
  saveRefDocuments(
    api,
    PROJECT_FILE_REF_TABLE.FINANCIALS,
    refId,
    files,
    urls,
  );
