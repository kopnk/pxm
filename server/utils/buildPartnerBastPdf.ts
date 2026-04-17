import PDFDocument from "pdfkit";

export type PartnerBastPdfLine = {
  siteId: string | null;
  siteName: string | null;
  workType: string | null;
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
};

const MARGIN = 44;

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
    `PO: ${meta.poNumberPartner || "—"}    Tanggal: ${meta.poDatePartnerLabel || "—"}`,
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
  doc.text("Nama / Jabatan :", ml, y, { width: mw });
  const firstPartyLineY = y + 13;
  const firstPartyLineStart = ml + 98;
  const firstPartyLineEnd = mr - 8;
  doc.save();
  doc.lineWidth(0.8);
  doc.strokeColor("#9ca3af");
  doc.dash(1, { space: 2 });
  doc.moveTo(firstPartyLineStart, firstPartyLineY).lineTo(firstPartyLineEnd, firstPartyLineY).stroke();
  doc.undash();
  doc.restore();
  y = firstPartyLineY + 8;
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
    `1. PO / SPK: ${meta.poNumberPartner || "—"}   Tanggal: ${meta.poDatePartnerLabel || "—"}`,
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
  y = doc.y + 8;

  doc.text("2. List site pekerjaan sebagai berikut:", ml, y, { width: mw });
  y = doc.y + 4;

  const colNo = ml;
  const colType = ml + 32;
  const colLoc = ml + 220;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text("No", colNo, y, { width: 28 });
  doc.text("Type Pekerjaan", colType, y, { width: 180 });
  doc.text("Lokasi Pekerjaan", colLoc, y, { width: mw - (colLoc - ml) });
  y += 12;

  doc.font("Helvetica").fontSize(9);
  lines.forEach((line, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - 140) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    const workType = line.workType || "Pekerjaan";
    const location = `${line.siteId || "—"} ${line.siteName || "—"}`.trim();

    doc.text(String(idx + 1), colNo, y, { width: 28 });
    doc.text(workType, colType, y, { width: 180 });
    doc.text(location, colLoc, y, { width: mw - (colLoc - ml) });

    const rowH = Math.max(
      doc.heightOfString(workType, { width: 180 }),
      doc.heightOfString(location, { width: mw - (colLoc - ml) }),
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
  doc.text(" ", leftX, y, { width: colW, align: "left" });
  doc.text(`${meta.signatoryName || "__________________________"}`, rightX, y, {
    width: colW,
    align: "right",
  });
  y += 12;
  doc.text(" ", leftX, y, { width: colW, align: "left" });
  doc.text(meta.signatoryTitle || "____________________________", rightX, y, {
    width: colW,
    align: "right",
  });
  y -= 3;

  doc.end();
  return done;
}
