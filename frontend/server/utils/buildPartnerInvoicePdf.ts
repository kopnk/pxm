import PDFDocument from "pdfkit";
import { pfListLineBase } from "../../lib/projectFinancialsMath";

export type PartnerInvoicePdfLine = {
  detailSiteId: string | null;
  detailSiteName: string | null;
  detailMaterialName: string | null;
  qtyPartner: unknown;
  unitPricePartner: unknown;
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

const idr = (n: number | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

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
  const colDesc = ml + 32;
  const colAmt = mr - 150;

  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("#", colNo, y, { width: 28, align: "center" });
  doc.text("Work Description", colDesc, y, { width: colAmt - colDesc - 6 });
  doc.text("Price", colAmt, y, { width: mr - colAmt, align: "right" });
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

    const desc =
      `${line.detailMaterialName || "Work"} ${line.detailSiteId || "—"} ${line.detailSiteName || "—"}`.trim();
    const total = pfListLineBase(line.qtyPartner, line.unitPricePartner);
    if (total != null) grandTotal += total;

    doc.text(String(idx + 1), colNo, y, { width: 28, align: "center" });
    doc.text(desc, colDesc, y, { width: colAmt - colDesc - 6 });
    doc.text(total != null ? idr(total) : "—", colAmt, y, {
      width: mr - colAmt,
      align: "right",
    });

    const rowH = Math.max(
      doc.heightOfString(desc, { width: colAmt - colDesc - 6 }),
      12,
    );
    y += rowH + 3;
  });

  doc.moveTo(ml, y).lineTo(mr, y).stroke();
  y += 8;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Total: ${idr(grandTotal)}`, ml, y, { width: mw, align: "right" });
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
