import PDFDocument from "pdfkit";
import { pfListLineBase } from "~/lib/projectFinancialsMath";
import { formatDateToIdText } from "~/utils/formatDateToIdText";

export type ClientInvoicePdfLine = {
  detailSiteId: string | null;
  detailSiteName: string | null;
  detailMaterialName: string | null;
  qtyClient: unknown;
  unitPriceClient: unknown;
};

export type ClientInvoicePdfMeta = {
  invoiceNumber: string;
  invoiceDate: string | null;
  poNumberClient: string | null;
  poDateClient: string | null;
  projectName: string | null;
  clientName: string | null;
  clientBankName: string | null;
  clientBankAccount: string | null;
  clientCity: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
};

const MARGIN = 44;

const idr = (n: number | null) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

function pageBounds(doc: InstanceType<typeof PDFDocument>) {
  const ml = doc.page.margins.left;
  const mr = doc.page.width - doc.page.margins.right;
  const mb = doc.page.height - doc.page.margins.bottom;
  const mw = mr - ml;
  return { ml, mr, mb, mw };
}

function normalizeInvoiceCity(city: string | null) {
  if (!city) return "Jakarta";
  return city.toLowerCase().startsWith("jakarta") ? "Jakarta" : city;
}

export async function buildClientInvoicePdfBuffer(
  lines: ClientInvoicePdfLine[],
  meta: ClientInvoicePdfMeta,
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

  const labelW = 90;
  const valueX = ml + labelW;
  doc.font("Helvetica").fontSize(10);
  doc.text("PO Date", ml, y, { width: labelW });
  doc.text(`: ${formatDateToIdText(meta.poDateClient)}`, valueX, y, {
    width: mw - labelW,
  });
  y = doc.y + 2;
  doc.text("No PO", ml, y, { width: labelW });
  doc.text(`: ${meta.poNumberClient || "—"}`, valueX, y, { width: mw - labelW });
  y = doc.y + 2;
  doc.text("No Invoice", ml, y, { width: labelW });
  doc.text(`: ${meta.invoiceNumber || "—"}`, valueX, y, { width: mw - labelW });
  y = doc.y + 2;
  doc.text("Tanggal Invoice", ml, y, { width: labelW });
  doc.text(`: ${formatDateToIdText(meta.invoiceDate)}`, valueX, y, {
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
  doc.text("No", colNo, y, { width: 28, align: "center" });
  doc.text("Uraian Pekerjaan", colDesc, y, { width: colAmt - colDesc - 6 });
  doc.text("Harga", colAmt, y, { width: mr - colAmt, align: "right" });
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
      `${line.detailMaterialName || "Pekerjaan"} ${line.detailSiteId || "—"} ${line.detailSiteName || "—"}`.trim();
    const total = pfListLineBase(line.qtyClient, line.unitPriceClient);
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

  doc.moveTo(ml, y).lineTo(mr, y).stroke();
  y += 10;

  doc.font("Helvetica").fontSize(9);
  doc.text("Payment can be transferred to:", ml, y, { width: mw });
  y = doc.y + 1;
  doc.text(
    "Account: 1234567890 Mandiri a.n Kopindosat",
    ml,
    y,
    { width: mw },
  );
  y = doc.y + 18;

  const invoiceCity = normalizeInvoiceCity(meta.clientCity);
  doc.text(
    `${invoiceCity}, ${formatDateToIdText(meta.invoiceDate)}`,
    mr - 220,
    y,
    {
      width: 220,
      align: "right",
    },
  );
  y += 84;
  doc.font("Helvetica").fontSize(10);
  doc.text(meta.signatoryName || "__________________________", mr - 220, y, {
    width: 220,
    align: "right",
  });
  y += 14;
  doc.font("Helvetica").fontSize(9);
  doc.text(meta.signatoryTitle || "", mr - 220, y, {
    width: 220,
    align: "right",
  });

  doc.end();
  return done;
}
