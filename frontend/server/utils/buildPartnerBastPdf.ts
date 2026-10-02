import PDFDocument from "pdfkit";
import { pfFormatQtyWithUom } from "~/lib/projectFinancialsMath";

export type PartnerBastPdfLine = {
  siteId: string | null;
  siteName: string | null;
  workType: string | null;
  partnerDocumentWorkLocation: string | null;
  qtyPartner: unknown;
  uom: string | null;
};

export type PartnerBastPdfMeta = {
  bastNumber: string;
  bastWeekdayLabel: string;
  bastDateLabel: string;
  poNumberPartner: string | null;
  poDatePartnerLabel: string | null;
  projectName: string | null;
  partnerName: string | null;
  partnerAddressText: string | null;
  signatoryName: string | null;
  signatoryTitle: string | null;
  kopindosatSignatoryName: string | null;
  kopindosatSignatoryTitle: string | null;
  paymentTerms: string[];
};

const MARGIN = 44;
const SIGNATURE_NAME_TO_LINE_GAP = 1.5;
const SIGNATURE_LINE_TO_TITLE_GAP = 3;
const SIGNATURE_SEPARATOR_COLOR = "#7A7A7A";
const SIGNATURE_SEPARATOR_WIDTH = 0.45;
function pageBounds(doc: InstanceType<typeof PDFDocument>) {
  const ml = doc.page.margins.left;
  const mr = doc.page.width - doc.page.margins.right;
  const mw = mr - ml;
  return { ml, mr, mw };
}

export async function buildPartnerBastPdfBuffer(
  lines: PartnerBastPdfLine[],
  meta: PartnerBastPdfMeta,
): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: `BAST ${meta.bastNumber}`, Author: "PXM" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const { ml, mr, mw } = pageBounds(doc);
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(14).text("BERITA ACARA SERAH TERIMA", ml, y, {
    width: mw,
    align: "center",
  });
  y = doc.y + 6;

  doc.font("Helvetica").fontSize(10).text(
    `BAST: ${meta.bastNumber || "—"}    Tanggal: ${meta.bastDateLabel || "—"}`,
    ml,
    y,
    { width: mw, align: "center" },
  );
  y = doc.y + 12;

  doc.font("Helvetica").fontSize(10).text(
    `Pada hari ini ${meta.bastWeekdayLabel} tanggal ${meta.bastDateLabel}, yang bertanda tangan di bawah ini:`,
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 8;

  doc.font("Helvetica-Bold").text("1. PIHAK PERTAMA", ml, y, { width: mw });
  y = doc.y + 3;
  doc.font("Helvetica");
  const firstPartyName = meta.kopindosatSignatoryName || "—";
  const firstPartyTitle = meta.kopindosatSignatoryTitle || "—";
  doc.text(`Nama / Jabatan : ${firstPartyName} / ${firstPartyTitle}`, ml, y, { width: mw });
  y = doc.y + 8;
  doc.text(
    "Dalam hal ini bertindak untuk dan atas nama KOPINDOSAT, selanjutnya disebut PIHAK PERTAMA.",
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 8;

  doc.font("Helvetica-Bold").text("2. PIHAK KEDUA", ml, y, { width: mw });
  y = doc.y + 3;
  doc.font("Helvetica");
  const secondPartySignatoryName = meta.signatoryName || meta.partnerName || "—";
  const secondPartySignatoryTitle = meta.signatoryTitle || "—";
  doc.text(`Nama / Jabatan : ${secondPartySignatoryName} / ${secondPartySignatoryTitle}`, ml, y, {
    width: mw,
  });
  y = doc.y + 2;
  doc.text(
    `Dalam hal ini bertindak untuk dan atas nama ${meta.partnerName || "—"}${
      meta.partnerAddressText ? ` yang beralamat di ${meta.partnerAddressText}` : ""
    }, selanjutnya disebut PIHAK KEDUA.`,
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 8;

  doc.text("Berdasarkan atas:", ml, y, { width: mw });
  y = doc.y + 2;
  doc.text(
    `1. WO / SPK: ${meta.poNumberPartner || "—"}   Tanggal: ${meta.poDatePartnerLabel || "—"}`,
    ml,
    y,
    { width: mw },
  );
  y = doc.y + 2;

  doc.text("Kedua belah pihak sepakat menyatakan hal-hal sebagai berikut:", ml, y, {
    width: mw,
  });
  y = doc.y + 2;
  doc.text(
    `a. PIHAK KEDUA menyerahkan kepada PIHAK PERTAMA, dan PIHAK PERTAMA menerima dari PIHAK KEDUA hasil pekerjaan ${
      meta.projectName || ""
    } yang telah selesai dilaksanakan dan diterima dengan baik.`,
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 2;
  doc.text(
    "b. Dengan ditandatanganinya Berita Acara Serah Terima ini, maka pekerjaan PIHAK KEDUA dinyatakan selesai.",
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 2;
  doc.text(
    "c. PIHAK KEDUA bertanggung jawab dan menjamin tidak akan ada permasalahan baik selama pekerjaan maupun setelah dilakukan serah terima.",
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 2;
  doc.text(
    meta.paymentTerms.length === 1 && meta.paymentTerms[0]?.endsWith("sebesar 100%")
      ? "d. Pembayaran atas pekerjaan ini dilakukan sebesar 100%."
      : `d. Pembayaran atas pekerjaan ini dilakukan sesuai ${meta.paymentTerms.join(" dan ") || "termin pembayaran sebesar 100%"}.`,
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 8;

  doc.text("2. List site pekerjaan sebagai berikut:", ml, y, { width: mw });
  y = doc.y + 4;

  const colNo = ml;
  const colType = ml + 32;
  const colLoc = ml + 220;
  const colQty = mr - 64;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("No", colNo, y, { width: 28 });
  doc.text("Type / Jenis Pekerjaan", colType, y, { width: 180 });
  doc.text("Details / Lokasi Pekerjaan", colLoc, y, { width: colQty - colLoc - 8 });
  doc.text("Qty / Items", colQty, y, { width: mr - colQty, align: "right" });
  y += 12;

  doc.font("Helvetica").fontSize(9);
  lines.forEach((line, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - 140) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    const workType = line.workType || "Pekerjaan";
    const location =
      line.partnerDocumentWorkLocation ||
      line.siteName ||
      "—";

    doc.text(String(idx + 1), colNo, y, { width: 28 });
    doc.text(workType, colType, y, { width: 180 });
    doc.text(location, colLoc, y, { width: colQty - colLoc - 8 });
    doc.text(pfFormatQtyWithUom(line.qtyPartner, line.uom), colQty, y, {
      width: mr - colQty,
      align: "right",
    });

    const rowH = Math.max(
      doc.heightOfString(workType, { width: 180 }),
      doc.heightOfString(location, { width: colQty - colLoc - 8 }),
      12,
    );
    y += rowH + 3;
  });

  y += 10;
  doc.text(
    "Demikian Berita Acara Serah Terima ini dibuat rangkap 2 (dua) asli untuk dipergunakan sebagaimana mestinya.",
    ml,
    y,
    { width: mw, align: "justify" },
  );
  y = doc.y + 14;

  // Keep signature block fully visible and avoid overlap on page bottom.
  if (y > doc.page.height - doc.page.margins.bottom - 120) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  const colW = (mw - 24) / 2;
  const leftX = ml;
  const rightX = ml + colW + 24;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Kopindosat", leftX, y, { width: colW, align: "left" });
  doc.text("Rekanan", rightX, y, { width: colW, align: "right" });

  // Lower the signature area so stamp/signature can fit comfortably.
  y += 72;


  doc.font("Helvetica").fontSize(10);
  y += 4;
  const kopindosatName = meta.kopindosatSignatoryName || "";
  const partnerName = meta.signatoryName || "__________________________";
  doc.text(kopindosatName, leftX, y, { width: colW, align: "left" });
  const kopindosatSeparatorY = doc.y + SIGNATURE_NAME_TO_LINE_GAP;
  const kopindosatLineWidth = Math.min(doc.widthOfString(kopindosatName), colW);
  if (kopindosatLineWidth > 0) {
    doc
      .strokeColor(SIGNATURE_SEPARATOR_COLOR)
      .lineWidth(SIGNATURE_SEPARATOR_WIDTH)
      .moveTo(leftX, kopindosatSeparatorY)
      .lineTo(leftX + kopindosatLineWidth, kopindosatSeparatorY)
      .stroke();
  }
  doc.strokeColor("#000000").lineWidth(1);
  doc.text(partnerName, rightX, y, {
    width: colW,
    align: "right",
  });
  const separatorY = doc.y + SIGNATURE_NAME_TO_LINE_GAP;
  const partnerLineWidth = Math.min(doc.widthOfString(partnerName), colW);
  if (partnerLineWidth > 0) {
    doc
      .strokeColor(SIGNATURE_SEPARATOR_COLOR)
      .lineWidth(SIGNATURE_SEPARATOR_WIDTH)
      .moveTo(rightX + colW - partnerLineWidth, separatorY)
      .lineTo(rightX + colW, separatorY)
      .stroke();
  }
  doc.strokeColor("#000000").lineWidth(1);

  y = Math.max(separatorY, kopindosatSeparatorY) + SIGNATURE_LINE_TO_TITLE_GAP;
  doc.text(meta.kopindosatSignatoryTitle || "", leftX, y, { width: colW, align: "left" });
  doc.text(meta.signatoryTitle || "____________________________", rightX, y, {
    width: colW,
    align: "right",
  });
  y -= 3;

  doc.end();
  return done;
}
