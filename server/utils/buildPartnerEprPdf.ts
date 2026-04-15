import PDFDocument from "pdfkit";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  pfListLineBase,
  pfParseNum,
  pfPartnerTaxRupiahForDisplay,
} from "~/composables/useProjectFinancialsDisplay";
import { formatDateToIdText } from "~/utils/formatDateToIdText";

export type PartnerEprPdfLine = {
  invoiceNumberPartner: string | null;
  invoiceDatePartner: string | null;
  detailMaterialName: string | null;
  qtyPartner: unknown;
  unitPricePartner: unknown;
  pph: unknown;
  taxIn: unknown;
  projectName: string | null;
  poNumberPartner: string | null;
  poDatePartner: string | null;
  partnerName: string | null;
  partnerBankName: string | null;
  partnerBankAccount: string | null;
};

type GroupedInvoice = {
  invoiceNumber: string;
  invoiceDate: string | null;
  desc: string;
  lineCount: number;
  baseAmount: number;
  pphPercent: number | null;
  pphAmount: number;
  taxPercent: number | null;
  taxAmount: number;
  totalPay: number;
};

const MARGIN = 44;
const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

const idNum = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);

function terbilangSimple(value: number): string {
  const n = Math.floor(Math.max(0, value));
  return `Terbilang: ${idNum(n)} rupiah`;
}

function groupedByInvoice(lines: PartnerEprPdfLine[]): GroupedInvoice[] {
  const map = new Map<string, GroupedInvoice>();
  for (const row of lines) {
    const invoiceNumber = row.invoiceNumberPartner?.trim() || "Tanpa Invoice";
    const base = pfListLineBase(row.qtyPartner, row.unitPricePartner) ?? 0;
    const pph =
      pfPartnerTaxRupiahForDisplay(row.qtyPartner, row.unitPricePartner, row.pph) ?? 0;
    const tax =
      pfPartnerTaxRupiahForDisplay(row.qtyPartner, row.unitPricePartner, row.taxIn) ?? 0;
    const existing = map.get(invoiceNumber);
    const rawPph = pfParseNum(row.pph);
    const rawTax = pfParseNum(row.taxIn);
    const desc = row.projectName?.trim() || row.detailMaterialName?.trim() || "Pekerjaan";

    if (existing) {
      existing.lineCount += 1;
      existing.baseAmount += base;
      existing.pphAmount += pph;
      existing.taxAmount += tax;
      existing.totalPay += base - pph + tax;
      continue;
    }

    map.set(invoiceNumber, {
      invoiceNumber,
      invoiceDate: row.invoiceDatePartner,
      desc,
      lineCount: 1,
      baseAmount: base,
      pphPercent: rawPph != null && rawPph <= 100 ? rawPph : null,
      pphAmount: pph,
      taxPercent: rawTax != null && rawTax <= 100 ? rawTax : null,
      taxAmount: tax,
      totalPay: base - pph + tax,
    });
  }
  return Array.from(map.values());
}

export async function buildPartnerEprPdfBuffer(
  lines: PartnerEprPdfLine[],
  po: string,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: `EPR ${po}`, Author: "PMS" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const first = lines[0];
  const groups = groupedByInvoice(lines);
  const ml = doc.page.margins.left;
  const mr = doc.page.width - doc.page.margins.right;
  const mb = doc.page.height - doc.page.margins.bottom;
  const mw = mr - ml;
  let y = doc.y;

  const today = formatDateToIdText(new Date().toISOString().slice(0, 10));
  const invoiceText = groups.map((g) => g.invoiceNumber).join(", ");

  const h1 = 48;
  const wLeft = mw * 0.28;
  const wCenter = mw * 0.45;
  const h2 = 54;
  const topX1 = ml + wLeft;
  const topX2 = ml + wLeft + wCenter;
  const bottomX1 = ml + mw * 0.5;

  doc.rect(ml, y, mw, h1 + h2).stroke();
  doc.moveTo(ml, y + h1).lineTo(mr, y + h1).stroke();
  doc.moveTo(topX1, y).lineTo(topX1, y + h1).stroke();
  doc.moveTo(topX2, y).lineTo(topX2, y + h1).stroke();
  doc.moveTo(bottomX1, y + h1).lineTo(bottomX1, y + h1 + h2).stroke();

  const logoCandidates = [
    join(process.cwd(), "public", "kopindosat.JPG"),
    join(process.cwd(), "public", "kopindosat.jpg"),
  ];
  const logoPath = logoCandidates.find((p) => existsSync(p));
  if (logoPath) {
    const logo = readFileSync(logoPath);
    doc.image(logo, ml + 8, y + 8, { fit: [wLeft - 16, h1 - 16], align: "left" });
  } else {
    doc.font(FONT_BOLD).fontSize(11).text("KOPINDOSAT", ml + 8, y + 8, {
      width: wLeft - 16,
    });
  }

  doc.font(FONT_BOLD).fontSize(12).text("EXTERNAL PAYMENT REQUEST", ml + wLeft + 8, y + 12, {
    width: wCenter - 16,
  });
  doc.font(FONT)
    .fontSize(9)
    .text("FILED BY AP", topX2 + 8, y + 8, { width: mr - topX2 - 16 })
    .text("TTT No:", topX2 + 8, y + 22, { width: mr - topX2 - 16 })
    .text(`Date: ${today}`, topX2 + 8, y + 34, { width: mr - topX2 - 16 });
  y += h1;

  doc.font(FONT).fontSize(9).text(
    "Has been received the following invoice documents:",
    ml + 8,
    y + 6,
    { width: bottomX1 - ml - 16 },
  );
  doc.text(`Accepted: ${first?.partnerName || "—"}`, ml + 8, y + 18, {
    width: bottomX1 - ml - 16,
  });
  doc.text(`No. Invoice: ${invoiceText || "—"}`, ml + 8, y + 30, {
    width: bottomX1 - ml - 16,
  });
  doc.text(`PO / Contract No: ${po}`, ml + 8, y + 42, {
    width: bottomX1 - ml - 16,
  });
  doc.text("Unit: Regional Kalimantan", bottomX1 + 8, y + 6, {
    width: mr - bottomX1 - 16,
    align: "left",
  });
  doc.text("Balikpapan No:", bottomX1 + 8, y + 22, {
    width: mr - bottomX1 - 16,
    align: "left",
  });
  y += h2 + 6;

  const cDesc = ml + 24;
  const cCur = mr - 140;
  const cAmt = mr - 74;
  const drawAmountRow = (label: string, amount: number, bold = false) => {
    doc.font(bold ? FONT_BOLD : FONT).fontSize(9);
    const textHeight = doc.heightOfString(label, { width: cCur - cDesc - 8 });
    const rowH = Math.max(20, Math.ceil(textHeight + 10));
    if (y + rowH > mb - 250) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.rect(ml, y, mw, rowH).stroke();
    doc.moveTo(cCur, y).lineTo(cCur, y + rowH).stroke();
    doc.moveTo(cAmt, y).lineTo(cAmt, y + rowH).stroke();
    doc.font(bold ? FONT_BOLD : FONT).fontSize(9);
    doc.text(label, cDesc + 4, y + 6, { width: cCur - cDesc - 8 });
    doc.text("Rp.", cCur + 4, y + 6, { width: cAmt - cCur - 8, align: "center" });
    doc.text(idNum(amount), cAmt + 4, y + 6, { width: mr - cAmt - 8, align: "right" });
    y += rowH;
  };

  const rowH = 20;
  doc.rect(ml, y, mw, rowH).stroke();
  doc.moveTo(cCur, y).lineTo(cCur, y + rowH).stroke();
  doc.moveTo(cAmt, y).lineTo(cAmt, y + rowH).stroke();
  doc.font(FONT_BOLD).fontSize(9).text("Description", cDesc + 4, y + 6, {
    width: cCur - cDesc - 8,
  });
  doc.text("Currency", cCur + 4, y + 6, { width: cAmt - cCur - 8, align: "center" });
  doc.text("Amount", cAmt + 4, y + 6, { width: mr - cAmt - 8, align: "center" });
  y += rowH;

  let grandPay = 0;
  let grandBase = 0;
  let grandPph = 0;
  let grandTax = 0;

  groups.forEach((g, idx) => {
    const siteLabel = g.lineCount > 1 ? "sites" : "site";
    drawAmountRow(`${idx + 1}. ${g.desc} (${g.lineCount} ${siteLabel})`, g.baseAmount, true);
    grandBase += g.baseAmount;
    grandPph += g.pphAmount;
    grandTax += g.taxAmount;
    grandPay += g.totalPay;
  });

  drawAmountRow("TOTAL", grandBase, true);
  drawAmountRow(`PPH ${(groups[0]?.pphPercent ?? 0).toString()}%`, grandPph, true);
  drawAmountRow(`TAX ${(groups[0]?.taxPercent ?? 0).toString()}%`, grandTax, true);
  drawAmountRow("GRAND TOTAL", grandPay, true);

  if (y + 208 > mb) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  doc.font(FONT).fontSize(8.5).text(
    "If condition match, then payment will be made approximately on date:\nPayment will be made via:",
    ml + 8,
    y + 4,
    { width: mw - 16 },
  );
  y += 34;

  const payColW = mw / 3;
  const payColX1 = ml + payColW;
  const payColX2 = ml + payColW * 2;
  doc.font(FONT)
    .fontSize(9)
    .text(`Transfer to: ${first?.partnerName || "—"}`, ml + 8, y + 6, {
      width: payColW - 16,
    })
    .text(`Bank: ${first?.partnerBankName || "—"}`, ml + 8, y + 19, {
      width: payColW - 16,
    })
    .text(`Rekening: ${first?.partnerBankAccount || "—"}`, ml + 8, y + 31, {
      width: payColW - 16,
    })
    .text("Giro Bilyet", payColX1 + 8, y + 6, { width: payColW - 16, align: "center" })
    .text("Cash", payColX2 + 8, y + 6, { width: payColW - 16, align: "center" });
  y += 40;
  y += 8;

  doc.rect(ml, y, mw, 16).stroke();
  const colW = mw / 3;
  const colX1 = ml + colW;
  const colX2 = ml + colW * 2;
  doc.moveTo(colX1, y).lineTo(colX1, y + 16).stroke();
  doc.moveTo(colX2, y).lineTo(colX2, y + 16).stroke();
  doc.font(FONT_BOLD).fontSize(8.5);
  doc.text("Date", ml + 8, y + 4, { width: colW - 16 });
  doc.text("Name & Signature", colX1 + 8, y + 4, { width: colW - 16 });
  doc.text("Remaks", colX2 + 8, y + 4, { width: colW - 16 });
  y += 16;

  doc.rect(ml, y, mw, 56).stroke();
  doc.moveTo(colX1, y).lineTo(colX1, y + 56).stroke();
  doc.moveTo(colX2, y).lineTo(colX2, y + 56).stroke();
  doc.font(FONT).fontSize(8.5);
  doc.text("Counter Officer", ml + 6, y + 6, { width: colW - 12 });
  doc.text(today, ml + 6, y + 36, { width: colW - 12 });
  doc.text("Regina Irawati", colX1 + 6, y + 36, { width: colW - 12 });
  y += 56;

  doc.rect(ml, y, mw, 56).stroke();
  doc.moveTo(colX1, y).lineTo(colX1, y + 56).stroke();
  doc.moveTo(colX2, y).lineTo(colX2, y + 56).stroke();
  doc.text("Supplier", ml + 6, y + 6, { width: colW - 12 });
  doc.text(today, ml + 6, y + 36, { width: colW - 12 });
  doc.text(first?.partnerName || "—", colX1 + 6, y + 36, { width: colW - 12 });
  y += 62;

  doc.font(FONT_BOLD).fontSize(9);
  doc.text("FOR TREASURY USE ONLY", ml, y, { width: mw });
  y += 12;
  doc.font(FONT).fontSize(8.5);
  const treColW = mw / 3;
  doc.text("Verified by: ____________________", ml, y, {
    width: treColW,
    align: "left",
  });
  doc.text("Authorized by: ____________________", ml + treColW, y, {
    width: treColW,
    align: "center",
  });
  doc.text("Bank Charges: ____________________", ml + treColW * 2, y, {
    width: treColW,
    align: "right",
  });
  y += 16;

  doc.font(FONT_BOLD).fontSize(9);
  doc.text("FOR ACCOUNTING USE ONLY      JOURNAL ENTRY      Batch:", ml, y, { width: mw });
  y += 10;
  doc.font(FONT).fontSize(8.5);
  doc.text("Period: ____________________", ml, y, { width: mw });
  y += 10;
  const accColW = mw / 4;
  doc.text("Account Number", ml, y, { width: accColW, align: "left" });
  doc.text("Description", ml + accColW, y, { width: accColW, align: "left" });
  doc.text("Debit", ml + accColW * 2, y, { width: accColW, align: "right" });
  doc.text("Credit", ml + accColW * 3, y, { width: accColW, align: "right" });
  y += 10;
  doc.rect(ml, y, mw, 30).stroke();
  y += 36;
  doc.font(FONT_BOLD).text("T O T A L:", ml, y, { width: mw * 0.6 });
  y += 14;
  doc.font(FONT).fontSize(8.5);
  const footerColW = mw / 3;
  doc.text("Payment Verified by", ml, y, { width: footerColW, align: "left" });
  doc.text("AP / AR Posted by", ml + footerColW, y, {
    width: footerColW,
    align: "center",
  });
  doc.text("GL Posted by", ml + footerColW * 2, y, {
    width: footerColW,
    align: "right",
  });

  doc.end();
  return done;
}
