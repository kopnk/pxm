import { sql } from "drizzle-orm";
import { projectFinancials } from "~/server/db/schema/project_financials";

/**
 * Ekspresi SQL per baris yang selaras dengan `pfPartnerLineTotal` /
 * `pfClientLineTotal` di `useProjectFinancialsDisplay.ts` (untuk agregat list).
 */
const basePartner = sql`(COALESCE(${projectFinancials.qtyPartner}::numeric, 0) * COALESCE(${projectFinancials.unitPricePartner}::numeric, 0))`;

const pphRupiah = sql`
  CASE
    WHEN ${projectFinancials.pph} IS NULL THEN 0::numeric
    WHEN ${projectFinancials.pph}::numeric > 100 THEN ${projectFinancials.pph}::numeric
    WHEN ${basePartner} <= 0 THEN 0::numeric
    ELSE ROUND(${basePartner} * ${projectFinancials.pph}::numeric / 100.0, 4)
  END
`;

const taxInRupiah = sql`
  CASE
    WHEN ${projectFinancials.taxIn} IS NULL THEN 0::numeric
    WHEN ${projectFinancials.taxIn}::numeric > 100 THEN ${projectFinancials.taxIn}::numeric
    WHEN ${basePartner} <= 0 THEN 0::numeric
    ELSE ROUND(${basePartner} * ${projectFinancials.taxIn}::numeric / 100.0, 4)
  END
`;

export const sqlPartnerListLineContribution = sql`
  CASE
    WHEN ${projectFinancials.flowDirection} = 'in'
      AND ${projectFinancials.qtyPartner} IS NOT NULL
      AND ${projectFinancials.unitPricePartner} IS NOT NULL
    THEN ${basePartner} - (${pphRupiah}) + (${taxInRupiah})
    ELSE 0::numeric
  END
`;

const baseClient = sql`(COALESCE(${projectFinancials.qtyClient}::numeric, 0) * COALESCE(${projectFinancials.unitPriceClient}::numeric, 0))`;

const taxOutRupiah = sql`
  CASE
    WHEN ${projectFinancials.taxOut} IS NULL THEN 0::numeric
    WHEN ${projectFinancials.taxOut}::numeric > 100 THEN ${projectFinancials.taxOut}::numeric
    WHEN ${baseClient} <= 0 THEN 0::numeric
    ELSE ROUND(${baseClient} * ${projectFinancials.taxOut}::numeric / 100.0, 4)
  END
`;

export const sqlClientListLineContribution = sql`
  CASE
    WHEN ${projectFinancials.flowDirection} = 'out'
      AND ${projectFinancials.qtyClient} IS NOT NULL
      AND ${projectFinancials.unitPriceClient} IS NOT NULL
    THEN ${baseClient} + (${taxOutRupiah})
    ELSE 0::numeric
  END
`;

/**
 * Section guards selaras dengan filter halaman tax-in / tax-out / pph
 * (lihat `projectFinancialsTaxSectionKindWhere` & filter di masing-masing
 * page Vue). Hanya baris yang lolos guard ini berkontribusi ke total Dpp/Tax
 * dari section terkait.
 */
const taxInSectionGuard = sql`
  ${projectFinancials.flowDirection} = 'in'
  AND ${projectFinancials.taxIn} IS NOT NULL
  AND (${projectFinancials.taxIn})::numeric > 0
  AND ${projectFinancials.qtyPartner} IS NOT NULL
  AND ${projectFinancials.unitPricePartner} IS NOT NULL
`;

const taxOutSectionGuard = sql`
  ${projectFinancials.flowDirection} = 'out'
  AND ${projectFinancials.taxOut} IS NOT NULL
  AND (${projectFinancials.taxOut})::numeric > 0
  AND ${projectFinancials.qtyClient} IS NOT NULL
  AND ${projectFinancials.unitPriceClient} IS NOT NULL
`;

const pphSectionGuard = sql`
  ${projectFinancials.flowDirection} = 'in'
  AND ${projectFinancials.pph} IS NOT NULL
  AND (${projectFinancials.pph})::numeric > 0
  AND ${projectFinancials.qtyPartner} IS NOT NULL
  AND ${projectFinancials.unitPricePartner} IS NOT NULL
`;

/** Dpp partner per baris untuk section tax-in (qty_partner × unit_price_partner). */
export const sqlTaxInSectionDppContribution = sql`
  CASE
    WHEN ${taxInSectionGuard}
    THEN ${basePartner}
    ELSE 0::numeric
  END
`;

/** Tax In rupiah per baris untuk section tax-in (selaras `pfPartnerTaxRupiahForDisplay`). */
export const sqlTaxInSectionTaxContribution = sql`
  CASE
    WHEN ${taxInSectionGuard}
    THEN ${taxInRupiah}
    ELSE 0::numeric
  END
`;

/** Dpp client per baris untuk section tax-out (qty_client × unit_price_client). */
export const sqlTaxOutSectionDppContribution = sql`
  CASE
    WHEN ${taxOutSectionGuard}
    THEN ${baseClient}
    ELSE 0::numeric
  END
`;

/** Tax Out rupiah per baris untuk section tax-out (selaras `pfClientTaxRupiahForDisplay`). */
export const sqlTaxOutSectionTaxContribution = sql`
  CASE
    WHEN ${taxOutSectionGuard}
    THEN ${taxOutRupiah}
    ELSE 0::numeric
  END
`;

/** Dpp partner per baris untuk section pph (qty_partner × unit_price_partner). */
export const sqlPphSectionDppContribution = sql`
  CASE
    WHEN ${pphSectionGuard}
    THEN ${basePartner}
    ELSE 0::numeric
  END
`;

/** PPH rupiah per baris untuk section pph (selaras `pfPartnerTaxRupiahForDisplay` pakai kolom pph). */
export const sqlPphSectionTaxContribution = sql`
  CASE
    WHEN ${pphSectionGuard}
    THEN ${pphRupiah}
    ELSE 0::numeric
  END
`;
