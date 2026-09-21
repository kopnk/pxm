import PDFDocument from "pdfkit";
import {
  pfAmountFromPercent,
  pfListLineBase,
  pfParseNum,
} from "../../lib/projectFinancialsMath";

export type PartnerInvoicePdfLine = {
  detailSiteId: string | null;
  detailSiteName: string | null;
  detailMaterialName: string | null;
  partnerDocumentWorkLocation: string | null;
  qtyPartner: unknown;
  unitPricePartner: unknown;
  partnerInstallment: string | null;
  partnerInstallmentPercent: unknown;
};

export type PartnerInvoicePdfMeta = {
  invoiceNumber: string;
  invoiceDate: string | null;
  poNumberPartner: string | null;
  poDatePartner: string | null;
  projectName: string | null;
  partnerName: string | null;
  partnerBankName: string | null;
  partnerBankAccount: string | null;
  partnerCity: string | null;
  signatoryName: string | null;
};

const MARGIN = 44;

const amountFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const amount = (n: number | null) => amountFormat.format(n ?? 0);

function installmentForInvoice(line: PartnerInvoicePdfLine) {
  const inputPercent = pfParseNum(line.partnerInstallmentPercent);
  const percent =
    inputPercent != null && inputPercent >= 0 && inputPercent <= 100
      ? inputPercent
      : 100;
  const name = line.partnerInstallment?.trim();
  return {
    percent,
    label: name
      ? `${name} (${numberFormat.format(percent)}%)`
      : `${numberFormat.format(percent)}%`,
  };
}

function formatEnglishDate(value: string | null): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "-";

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function pageBounds(doc: InstanceType<typeof PDFDocument>) {
  const ml = doc.page.margins.left;
  const mr = doc.page.width - doc.page.margins.right;
  const mb = doc.page.height - doc.page.margins.bottom;
  const mw = mr - ml;
  return { ml, mr, mb, mw };
}

export async function buildPartnerInvoicePdfBuffer(
  lines: PartnerInvoicePdfLine[],
  meta: PartnerInvoicePdfMeta,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: `Invoice ${meta.invoiceNumber}`, Author: "PXM" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const { ml, mr, mb, mw } = pageBounds(doc);
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(16).text("INVOICE", ml, y, {
    width: mw,
    align: "center",
  });
  y = doc.y + 14;

  const labelW = 84;
  const valueX = ml + labelW;
  doc.font("Helvetica").fontSize(10);
  doc.text("PO Date", ml, y, { width: labelW });
  doc.text(`: ${formatEnglishDate(meta.poDatePartner)}`, valueX, y, {
    width: mw - labelW,
  });
  y = doc.y + 2;
  doc.text("PO Number", ml, y, { width: labelW });
  doc.text(`: ${meta.poNumberPartner || "—"}`, valueX, y, { width: mw - labelW });
  y = doc.y + 2;
  doc.text("Invoice Number", ml, y, { width: labelW });
  doc.text(`: ${meta.invoiceNumber || "—"}`, valueX, y, { width: mw - labelW });
  y = doc.y + 2;
  doc.text("Invoice Date", ml, y, { width: labelW });
  doc.text(`: ${formatEnglishDate(meta.invoiceDate)}`, valueX, y, {
    width: mw - labelW,
  });
  y = doc.y + 2;
  doc.text("Project Name", ml, y, { width: labelW });
  doc.text(`: ${meta.projectName || "—"}`, valueX, y, { width: mw - labelW });
  y = doc.y + 14;

  const colNo = ml;
  const colDesc = ml + 25;
  const colQty = ml + 165;
  const colUnitPrice = ml + 200;
  const colTotalPrice = ml + 275;
  const colInstallment = ml + 350;
  const colInvoiceAmount = ml + 420;

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("#", colNo, y, { width: 21, align: "center" });
  doc.text("Work Description", colDesc, y, { width: colQty - colDesc - 6 });
  doc.text("Qty", colQty, y, { width: colUnitPrice - colQty - 4, align: "right" });
  doc.text("Unit Price", colUnitPrice, y, {
    width: colTotalPrice - colUnitPrice - 4,
    align: "right",
  });
  doc.text("Total Price", colTotalPrice, y, {
    width: colInstallment - colTotalPrice - 4,
    align: "right",
  });
  doc.text("Installment", colInstallment, y, {
    width: colInvoiceAmount - colInstallment - 4,
    align: "right",
  });
  doc.text("Invoice Amount", colInvoiceAmount, y, {
    width: mr - colInvoiceAmount,
    align: "right",
  });
  y += 11;
  doc.moveTo(ml, y).lineTo(mr, y).stroke();
  y += 4;

  doc.font("Helvetica").fontSize(9);
  let grandTotal = 0;
  lines.forEach((line, idx) => {
    if (y > mb - 120) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    const workType = line.detailMaterialName || "Work";
    const workLocation =
      line.partnerDocumentWorkLocation ||
      line.detailSiteName ||
      "—";
    const desc = `${workType} ${workLocation}`.trim();
    const qty = pfParseNum(line.qtyPartner);
    const unitPrice = pfParseNum(line.unitPricePartner);
    const base = pfListLineBase(line.qtyPartner, line.unitPricePartner);
    const installment = installmentForInvoice(line);
    const total = pfAmountFromPercent(base, installment.percent) ?? base;
    if (total != null) grandTotal += total;

    doc.text(String(idx + 1), colNo, y, { width: 21, align: "center" });
    doc.text(desc, colDesc, y, { width: colQty - colDesc - 6 });
    doc.text(
      qty != null ? numberFormat.format(qty) : "—",
      colQty,
      y,
      { width: colUnitPrice - colQty - 4, align: "right" },
    );
    doc.text(unitPrice != null ? amount(unitPrice) : "—", colUnitPrice, y, {
      width: colTotalPrice - colUnitPrice - 4,
      align: "right",
    });
    doc.text(base != null ? amount(base) : "—", colTotalPrice, y, {
      width: colInstallment - colTotalPrice - 4,
      align: "right",
    });
    doc.text(installment.label, colInstallment, y, {
      width: colInvoiceAmount - colInstallment - 4,
      align: "right",
    });
    doc.text(total != null ? amount(total) : "—", colInvoiceAmount, y, {
      width: mr - colInvoiceAmount,
      align: "right",
    });

    const rowH = Math.max(
      doc.heightOfString(desc, { width: colQty - colDesc - 6 }),
      12,
    );
    y += rowH + 3;
  });

  doc.moveTo(ml, y).lineTo(mr, y).stroke();
  y += 8;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Total: ${amount(grandTotal)}`, ml, y, { width: mw, align: "right" });
  y = doc.y + 10;

  if (y + 220 > mb) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  y += 10;

  doc.font("Helvetica").fontSize(9);
  doc.text("Payment can be transferred to:", ml, y, { width: mw });
  y = doc.y + 1;
  doc.text(`Bank: ${meta.partnerBankName || "—"}`, ml, y, { width: mw });
  y = doc.y + 1;
  doc.text(`Account Number: ${meta.partnerBankAccount || "—"}`, ml, y, {
    width: mw,
  });
  y = doc.y + 1;
  doc.text(`Account Name: ${meta.partnerName || "—"}`, ml, y, { width: mw });
  y = doc.y + 18;

  doc.text(`${meta.partnerCity || "—"}, ${formatEnglishDate(meta.invoiceDate)}`, mr - 220, y, {
    width: 220,
    align: "right",
  });
  y += 84;
  doc.font("Helvetica").fontSize(10);
  doc.text(meta.signatoryName || "__________________________", mr - 220, y, {
    width: 220,
    align: "right",
  });

  doc.end();
  return done;
}
