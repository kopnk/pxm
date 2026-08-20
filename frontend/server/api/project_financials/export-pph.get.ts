import { defineEventHandler } from "h3";
import { handleProjectFinancialsTaxSectionExport } from "~/server/utils/handleProjectFinancialsTaxSectionExport";

export default defineEventHandler((event) =>
  handleProjectFinancialsTaxSectionExport(event, "pph"),
);
