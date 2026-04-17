import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  pfPartnerLineTotal,
  pfParseNum,
} from "~/composables/useProjectFinancialsDisplay";

export type PartnerPoPdfLine = {
  detailSiteId: string | null;
  detailSiteName: string | null;
  detailMaterialName: string | null;
  qtyPartner: unknown;
  unitPricePartner: unknown;
  pph: unknown;
  taxIn: unknown;
};

export type PartnerPoPdfMeta = {
  poNumber: string;
  poDateLabel: string;
  projectName: string | null;
  projectPoNumber: string | null;
  partnerName: string | null;
  partnerNpwp: string | null;
  partnerAddressText: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  qrTargetUrl: string;
};

/** A4 symmetric side margin (~15.5 mm) for printing. */
const MARGIN = 44;
const LOGO_HEADER_HEIGHT = 34;

const idr = (n: number | null) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

function fmtQty(v: unknown): string {
  const num = Number(v ?? 0);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(num);
}

function pageInnerBounds(doc: InstanceType<typeof PDFDocument>) {
  const ml = doc.page.margins.left;
  const mr = doc.page.width - doc.page.margins.right;
  const mt = doc.page.margins.top;
  const mb = doc.page.height - doc.page.margins.bottom;
  return { ml, mr, mt, mb, mw: mr - ml };
}

/** Column x positions and widths from current page margins (recompute after addPage). */
function tableLayout(doc: InstanceType<typeof PDFDocument>) {
  const { ml, mr, mw } = pageInnerBounds(doc);
  const wNo = 0.05 * mw;
  const wSiteId = 0.12 * mw;
  const wSite = 0.21 * mw;
  const wMat = 0.21 * mw;
  const wQty = 0.09 * mw;
  const wUnit = 0.16 * mw;
  const wAmt = mw - wNo - wSiteId - wSite - wMat - wQty - wUnit;

  let x = ml;
  const c0 = x;
  x += wNo;
  const c1 = x;
  x += wSiteId;
  const c2 = x;
  x += wSite;
  const c3 = x;
  x += wMat;
  const c4 = x;
  x += wQty;
  const c5 = x;
  x += wUnit;
  const c6 = x;

  return { ml, mr, mw, c0, c1, c2, c3, c4, c5, c6, wNo, wSiteId, wSite, wMat, wQty, wUnit, wAmt };
}

export async function buildPartnerPoPdfBuffer(
  lines: PartnerPoPdfLine[],
  meta: PartnerPoPdfMeta,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: `PO ${meta.poNumber}`, Author: "PXM" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const footerReserve = 100;
  let { ml, mr, mw } = pageInnerBounds(doc);
  let y = doc.y;

  /* One line: logo/text Kopindosat | Purchase Order */
  doc.font("Helvetica-Bold").fontSize(13);
  const headerH = doc.currentLineHeight();
  const logoCandidates = [
    join(process.cwd(), "public", "kopindosat.JPG"),
    join(process.cwd(), "public", "kopindosat.jpg"),
  ];
  const logoPath = logoCandidates.find((p) => existsSync(p));

  if (logoPath) {
    const logo = readFileSync(logoPath);
    doc.image(logo, ml, y - 3, { height: LOGO_HEADER_HEIGHT });
  } else {
    doc.text("Kopindosat", ml, y, { lineBreak: false });
  }

  const poTitle = "Purchase Order";
  doc.text(poTitle, mr - doc.widthOfString(poTitle), y, { lineBreak: false });
  y += Math.max(headerH, LOGO_HEADER_HEIGHT) + 10;
  doc.y = y;

  const labelW = 68;
  const valueX = ml + labelW;

  doc.font("Helvetica").fontSize(10);
  doc.text("PO Number:", ml, y, { width: labelW });
  doc.text(meta.poNumber, valueX, y, { width: mw - labelW });
  y = doc.y + 2;
  doc.text("PO Date:", ml, y, { width: labelW });
  doc.text(meta.poDateLabel, valueX, y, { width: mw - labelW });
  y = doc.y + 8;

  const toName = meta.partnerName?.trim() || "—";
  const toNameHeight = doc.heightOfString(toName, { width: mw - labelW });
  doc.font("Helvetica-Bold").text("To:", ml, y, { width: labelW, lineBreak: false });
  doc.font("Helvetica").text(toName, valueX, y, {
    width: mw - labelW,
    lineBreak: false,
  });
  y += Math.max(doc.currentLineHeight(), toNameHeight) + 4;

  if (meta.partnerAddressText?.trim()) {
    const address = meta.partnerAddressText.trim();
    const addressHeight = doc.heightOfString(address, { width: mw - labelW });
    doc.fontSize(9).text(address, valueX, y, {
      width: mw - labelW,
      lineBreak: false,
    });
    y += addressHeight + 4;
  }
  if (meta.partnerNpwp?.trim()) {
    const npwp = meta.partnerNpwp.trim();
    const npwpHeight = doc.heightOfString(npwp, { width: mw - labelW });
    doc.text("Tax ID (NPWP):", ml, y, { width: labelW, lineBreak: false });
    doc.text(npwp, valueX, y, { width: mw - labelW, lineBreak: false });
    y += Math.max(doc.currentLineHeight(), npwpHeight) + 12;
  } else {
    y += 10;
  }

  doc.fontSize(10);
  doc.text(`Project Name: ${meta.projectName || "—"}`, ml, y, { width: mw });
  y = doc.y + 8;

  let T = tableLayout(doc);
  const tableTop = y;
  doc.font("Helvetica-Bold").fontSize(8);
  doc.text("#", T.c0, tableTop, { width: T.wNo, align: "center" });
  doc.text("Site ID", T.c1, tableTop, { width: T.wSiteId });
  doc.text("Site Name", T.c2, tableTop, { width: T.wSite });
  doc.text("Material", T.c3, tableTop, { width: T.wMat });
  doc.text("Qty", T.c4, tableTop, { width: T.wQty, align: "right" });
  doc.text("Unit Price", T.c5, tableTop, { width: T.wUnit, align: "right" });
  doc.text("Line Total", T.c6, tableTop, { width: T.wAmt, align: "right" });

  y = tableTop + 12;
  doc.font("Helvetica").fontSize(8);

  let grand = 0;
  lines.forEach((row, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - footerReserve) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    T = tableLayout(doc);

    const lineTotal = pfPartnerLineTotal(
      row.qtyPartner,
      row.unitPricePartner,
      row.pph,
      row.taxIn,
    );
    if (lineTotal != null) grand += lineTotal;

    const siteId = (row.detailSiteId ?? "").trim() || "—";
    const siteName = (row.detailSiteName ?? "").trim() || "—";
    const mat = (row.detailMaterialName ?? "").trim() || "—";

    doc.text(String(idx + 1), T.c0, y, { width: T.wNo, align: "center" });
    doc.text(siteId, T.c1, y, { width: T.wSiteId });
    doc.text(siteName, T.c2, y, { width: T.wSite });
    doc.text(mat, T.c3, y, { width: T.wMat });
    doc.text(fmtQty(row.qtyPartner), T.c4, y, { width: T.wQty, align: "right" });
    const unitP = pfParseNum(row.unitPricePartner);
    doc.text(unitP != null ? idr(unitP) : "—", T.c5, y, {
      width: T.wUnit,
      align: "right",
    });
    doc.text(lineTotal != null ? idr(lineTotal) : "—", T.c6, y, {
      width: T.wAmt,
      align: "right",
    });

    const rowH = Math.max(
      doc.heightOfString(siteName, { width: T.wSite }),
      doc.heightOfString(mat, { width: T.wMat }),
      11,
    );
    y += rowH + 3;
  });

  T = tableLayout(doc);
  doc.moveTo(T.ml, y).lineTo(T.mr, y).stroke();
  y += 6;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`Total: ${idr(grand)}`, T.ml, y, { align: "right", width: T.mw });
  y += 28;

  T = tableLayout(doc);
  if (y > doc.page.height - doc.page.margins.bottom - footerReserve) {
    doc.addPage();
    y = doc.page.margins.top;
    T = tableLayout(doc);
  }

  const qrPt = Math.round((88 / 6) * 1.25);
  const qrBuf = await QRCode.toBuffer(meta.qrTargetUrl, {
    type: "png",
    width: 160,
    margin: 0,
  });

  const footY = y;
  doc.font("Helvetica-Bold").fontSize(9);
  const kLabel = "Kopindosat";
  doc.text(kLabel, T.ml, footY, { width: T.mw * 0.48, lineBreak: false });
  doc.image(qrBuf, T.ml, footY + 24, { width: qrPt, height: qrPt });

  const partnerHead = "Partner";
  const phw = doc.widthOfString(partnerHead);
  doc.text(partnerHead, T.mr - phw, footY, { lineBreak: false });

  y = footY + Math.max(qrPt + 24, doc.currentLineHeight()) + 8;

  doc.font("Helvetica").fontSize(8.5);
  const rightColW = T.mw * 0.48;
  const rightX = T.mr - rightColW;
  y += 32;
  doc.text(meta.signatoryName?.trim() || "………………", rightX, y, {
    width: rightColW,
    align: "right",
  });
  y = doc.y + 2;
  doc.text(meta.signatoryTitle?.trim() || "………………", rightX, y, {
    width: rightColW,
    align: "right",
  });

  doc.end();
  return done;
}
