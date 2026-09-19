import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import {
  pfPartnerLineTotal,
  pfParseNum,
} from "../../lib/projectFinancialsMath";
import { readKopindosatLogoBuffer } from "./pdfBranding";

export type PartnerPoPdfLine = {
  detailSiteId: string | null;
  detailSiteName: string | null;
  detailMaterialName: string | null;
  partnerDocumentWorkLocation: string | null;
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

  /**
   * Specimen tanda tangan Partner.
   */
  signatoryName: string | null;
  signatoryTitle: string | null;

  /**
   * Specimen tanda tangan Kopindosat.
   *
   * Optional supaya kode lama tetap kompatibel.
   */
  kopindosatSignatoryName?: string | null;
  kopindosatSignatoryTitle?: string | null;

  qrTargetUrl: string;
};

/**
 * ============================================================
 * GLOBAL CONFIG
 * ============================================================
 */

/**
 * A4 symmetric margin.
 * 44 pt ≈ 15.5 mm.
 */
const MARGIN = 44;

/**
 * Logo header.
 */
const LOGO_HEADER_HEIGHT = 34;

/**
 * QR kanan atas.
 */
const QR_SIZE = 40;

/**
 * Jarak QR dari tulisan Purchase Order.
 */
const QR_TOP_GAP = 7;

/**
 * Ruang footer/tanda tangan.
 */
const FOOTER_RESERVE = 110;

/**
 * ============================================================
 * SIGNATURE SPECIMEN CONFIG
 * ============================================================
 */

/**
 * Warna garis specimen.
 */
const SIGNATURE_SEPARATOR_COLOR = "#C7C7C7";

/**
 * Sebelumnya 0.5 pt.
 *
 * Sekarang ±1/3 dari ukuran sebelumnya.
 */
const SIGNATURE_SEPARATOR_WIDTH = 0.18;

/**
 * Panjang garis specimen.
 *
 * Tidak lagi memenuhi seluruh kolom.
 */
const SIGNATURE_LINE_WIDTH = 135;

/**
 * Jarak vertikal:
 *
 * Nama
 * ↓
 * Garis
 * ↓
 * Title
 */
const SIGNATURE_NAME_TO_LINE_GAP = 4;
const SIGNATURE_LINE_TO_TITLE_GAP = 4;

/**
 * Posisi vertikal specimen dari header
 * Kopindosat / Partner.
 */
const SIGNATURE_TOP_SPACE = 78;

/**
 * ============================================================
 * FORMATTER
 * ============================================================
 */

const idr = (n: number | null): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

function fmtQty(v: unknown): string {
  const num = Number(v ?? 0);

  if (!Number.isFinite(num)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(num);
}

/**
 * ============================================================
 * PAGE BOUNDS
 * ============================================================
 */

function pageInnerBounds(
  doc: InstanceType<typeof PDFDocument>,
) {
  const ml = doc.page.margins.left;
  const mr =
    doc.page.width -
    doc.page.margins.right;

  const mt =
    doc.page.margins.top;

  const mb =
    doc.page.height -
    doc.page.margins.bottom;

  const mw =
    mr - ml;

  return {
    ml,
    mr,
    mt,
    mb,
    mw,
  };
}

/**
 * ============================================================
 * TABLE LAYOUT
 * ============================================================
 */

function tableLayout(
  doc: InstanceType<typeof PDFDocument>,
) {
  const {
    ml,
    mr,
    mw,
  } = pageInnerBounds(doc);

  const wNo =
    0.05 * mw;

  const wSiteId =
    0.12 * mw;

  // Give the free-form site wording enough room to wrap without intruding
  // into the Material column.
  const wSite =
    0.28 * mw;

  const wMat =
    0.14 * mw;

  const wQty =
    0.09 * mw;

  const wUnit =
    0.16 * mw;

  const wAmt =
    mw -
    wNo -
    wSiteId -
    wSite -
    wMat -
    wQty -
    wUnit;

  let x = ml;

  const c0 = x;
  x += wNo;

  const c1 = x;
  x += wMat;

  const c2 = x;
  x += wSiteId;

  const c3 = x;
  x += wSite;

  const c4 = x;
  x += wQty;

  const c5 = x;
  x += wUnit;

  const c6 = x;

  return {
    ml,
    mr,
    mw,

    c0,
    c1,
    c2,
    c3,
    c4,
    c5,
    c6,

    wNo,
    wMat,
    wSiteId,
    wSite,

    wQty,
    wUnit,
    wAmt,
  };
}

/**
 * ============================================================
 * TABLE HEADER
 * ============================================================
 */

function renderTableHeader(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
): number {
  const T =
    tableLayout(doc);

  doc
    .fillColor("#000000")
    .font("Helvetica-Bold")
    .fontSize(8);

  doc.text(
    "#",
    T.c0,
    y,
    {
      width: T.wNo,
      align: "center",
    },
  );

  doc.text(
    "Material",
    T.c1,
    y,
    {
      width: T.wMat,
    },
  );

  doc.text(
    "Site ID",
    T.c2,
    y,
    {
      width: T.wSiteId,
    },
  );

  doc.text(
    "Details / List Site",
    T.c3,
    y,
    {
      width: T.wSite,
    },
  );



  doc.text(
    "Qty",
    T.c4,
    y,
    {
      width: T.wQty,
      align: "right",
    },
  );

  doc.text(
    "Unit Price",
    T.c5,
    y,
    {
      width: T.wUnit,
      align: "right",
    },
  );

  doc.text(
    "Total Price",
    T.c6,
    y,
    {
      width: T.wAmt,
      align: "right",
    },
  );

  doc
    .font("Helvetica")
    .fontSize(8);

  return y + 12;
}

/**
 * ============================================================
 * SIGNATURE SPECIMEN HELPER
 * ============================================================
 */

/**
 * Render specimen:
 *
 * Nama
 * ─────────────
 * Jabatan
 *
 * @param align
 * left  = specimen Kopindosat
 * right = specimen Partner
 */
function renderSignatureSpecimen(
  doc: InstanceType<typeof PDFDocument>,
  options: {
    columnX: number;
    columnWidth: number;
    y: number;
    name: string;
    title: string;
    align: "left" | "right";
  },
) {
  const {
    columnX,
    columnWidth,
    y,
    name,
    title,
    align,
  } = options;

  /**
   * ============================================================
   * NAME
   * ============================================================
   */

  doc
    .fillColor("#000000")
    .font("Helvetica")
    .fontSize(8.5);

  doc.text(
    name,
    columnX,
    y,
    {
      width: columnWidth,
      align,
    },
  );

  const nameBottomY =
    doc.y;

  /**
   * ============================================================
   * SEPARATOR LINE POSITION
   * ============================================================
   */

  const separatorY =
    nameBottomY +
    SIGNATURE_NAME_TO_LINE_GAP;

  /**
   * Panjang garis dibatasi.
   */
  const actualLineWidth =
    Math.min(
      SIGNATURE_LINE_WIDTH,
      columnWidth,
    );

  let lineStartX: number;
  let lineEndX: number;

  if (align === "right") {
    /**
     * Partner:
     * garis menempel/rata kanan.
     */
    lineEndX =
      columnX +
      columnWidth;

    lineStartX =
      lineEndX -
      actualLineWidth;
  } else {
    /**
     * Kopindosat:
     * garis menempel/rata kiri.
     */
    lineStartX =
      columnX;

    lineEndX =
      columnX +
      actualLineWidth;
  }

  /**
   * ============================================================
   * THIN GREY LINE
   * ============================================================
   */

  doc
    .strokeColor(
      SIGNATURE_SEPARATOR_COLOR,
    )
    .lineWidth(
      SIGNATURE_SEPARATOR_WIDTH,
    )
    .moveTo(
      lineStartX,
      separatorY,
    )
    .lineTo(
      lineEndX,
      separatorY,
    )
    .stroke();

  /**
   * Reset stroke configuration.
   */
  doc
    .strokeColor("#000000")
    .lineWidth(1);

  /**
   * ============================================================
   * TITLE
   * ============================================================
   */

  const titleY =
    separatorY +
    SIGNATURE_LINE_TO_TITLE_GAP;

  doc
    .fillColor("#000000")
    .font("Helvetica")
    .fontSize(8.5)
    .text(
      title,
      columnX,
      titleY,
      {
        width: columnWidth,
        align,
      },
    );

  return doc.y;
}

/**
 * ============================================================
 * PDF BUILDER
 * ============================================================
 */

export async function buildPartnerPoPdfBuffer(
  lines: PartnerPoPdfLine[],
  meta: PartnerPoPdfMeta,
): Promise<Buffer> {
  const doc =
    new PDFDocument({
      size: "A4",

      margins: {
        top: MARGIN,
        bottom: MARGIN,
        left: MARGIN,
        right: MARGIN,
      },

      info: {
        Title:
          `PO ${meta.poNumber}`,

        Author:
          "PXM",
      },
    });

  /**
   * ============================================================
   * BUFFER OUTPUT
   * ============================================================
   */

  const chunks: Buffer[] =
    [];

  doc.on(
    "data",
    (chunk: Buffer) => {
      chunks.push(chunk);
    },
  );

  const done =
    new Promise<Buffer>(
      (
        resolve,
        reject,
      ) => {
        doc.on(
          "end",
          () => {
            resolve(
              Buffer.concat(
                chunks,
              ),
            );
          },
        );

        doc.on(
          "error",
          reject,
        );
      },
    );

  /**
   * ============================================================
   * QR CODE
   * ============================================================
   */

  const qrBuf =
    await QRCode.toBuffer(
      meta.qrTargetUrl,
      {
        type: "png",
        width: 320,
        margin: 2,
        errorCorrectionLevel:
          "M",
      },
    );

  /**
   * ============================================================
   * PAGE BOUNDS
   * ============================================================
   */

  let {
    ml,
    mr,
    mw,
  } =
    pageInnerBounds(doc);

  let y =
    doc.y;

  /**
   * ============================================================
   * HEADER
   * ============================================================
   */

  doc
    .fillColor("#000000")
    .font(
      "Helvetica-Bold",
    )
    .fontSize(13);

  const logo =
    readKopindosatLogoBuffer();

  const headerTextHeight =
    doc.currentLineHeight();

  /**
   * Kopindosat logo.
   */
  if (logo) {
    doc.image(
      logo,
      ml,
      y - 3,
      {
        height:
          LOGO_HEADER_HEIGHT,
      },
    );
  } else {
    doc.text(
      "Kopindosat",
      ml,
      y,
      {
        lineBreak: false,
      },
    );
  }

  /**
   * Purchase Order.
   */
  const poTitle =
    "Purchase Order";

  const poTitleWidth =
    doc.widthOfString(
      poTitle,
    );

  const poTitleX =
    mr -
    poTitleWidth;

  const poTitleY = y;

  doc.text(
    poTitle,
    poTitleX,
    poTitleY,
    {
      lineBreak: false,
    },
  );

  /**
   * ============================================================
   * QR
   * ============================================================
   */

  const qrX =
    mr -
    QR_SIZE;

  const qrY =
    poTitleY +
    headerTextHeight +
    QR_TOP_GAP;

  doc.image(
    qrBuf,
    qrX,
    qrY,
    {
      width: QR_SIZE,
      height: QR_SIZE,
    },
  );

  /**
   * Information starts below logo/header.
   */
  y +=
    Math.max(
      headerTextHeight,
      LOGO_HEADER_HEIGHT,
    ) + 10;

  doc.y = y;

  /**
   * ============================================================
   * PO INFO
   * ============================================================
   */

  const labelW =
    68;

  const valueX =
    ml +
    labelW;

  doc
    .fillColor("#000000")
    .font("Helvetica")
    .fontSize(10);

  /**
   * PO Number.
   */
  doc.text(
    "PO Number:",
    ml,
    y,
    {
      width: labelW,
      lineBreak: false,
    },
  );

  doc.text(
    meta.poNumber ||
      "—",
    valueX,
    y,
    {
      width:
        mw -
        labelW,

      lineBreak: false,
    },
  );

  y =
    doc.y + 2;

  /**
   * PO Date.
   */
  doc.text(
    "PO Date:",
    ml,
    y,
    {
      width: labelW,
      lineBreak: false,
    },
  );

  doc.text(
    meta.poDateLabel ||
      "—",
    valueX,
    y,
    {
      width:
        mw -
        labelW,

      lineBreak: false,
    },
  );

  y =
    doc.y + 8;

  /**
   * ============================================================
   * PARTNER DATA
   * ============================================================
   */

  const toName =
    meta.partnerName?.trim() ||
    "—";

  const toNameHeight =
    doc.heightOfString(
      toName,
      {
        width:
          mw -
          labelW,
      },
    );

  doc
    .font(
      "Helvetica-Bold",
    )
    .fontSize(10)
    .text(
      "To:",
      ml,
      y,
      {
        width:
          labelW,

        lineBreak:
          false,
      },
    );

  doc
    .font(
      "Helvetica",
    )
    .fontSize(10)
    .text(
      toName,
      valueX,
      y,
      {
        width:
          mw -
          labelW,

        lineBreak:
          false,
      },
    );

  y +=
    Math.max(
      doc.currentLineHeight(),
      toNameHeight,
    ) + 4;

  /**
   * Partner address.
   */
  if (
    meta.partnerAddressText?.trim()
  ) {
    const address =
      meta.partnerAddressText.trim();

    const addressHeight =
      doc.heightOfString(
        address,
        {
          width:
            mw -
            labelW,
        },
      );

    doc
      .font(
        "Helvetica",
      )
      .fontSize(9)
      .text(
        address,
        valueX,
        y,
        {
          width:
            mw -
            labelW,
        },
      );

    y +=
      addressHeight +
      4;
  }

  /**
   * NPWP.
   */
  if (
    meta.partnerNpwp?.trim()
  ) {
    const npwp =
      meta.partnerNpwp.trim();

    const npwpHeight =
      doc.heightOfString(
        npwp,
        {
          width:
            mw -
            labelW,
        },
      );

    doc
      .font(
        "Helvetica",
      )
      .fontSize(9)
      .text(
        "Tax ID (NPWP):",
        ml,
        y,
        {
          width:
            labelW,

          lineBreak:
            false,
        },
      );

    doc.text(
      npwp,
      valueX,
      y,
      {
        width:
          mw -
          labelW,

        lineBreak:
          false,
      },
    );

    y +=
      Math.max(
        doc.currentLineHeight(),
        npwpHeight,
      ) + 12;
  } else {
    y += 10;
  }

  /**
   * ============================================================
   * PROJECT NAME
   * ============================================================
   */

  doc
    .fillColor(
      "#000000",
    )
    .font(
      "Helvetica",
    )
    .fontSize(10)
    .text(
      `Project Name: ${
        meta.projectName?.trim() ||
        "—"
      }`,
      ml,
      y,
      {
        width: mw,
      },
    );

  y =
    doc.y + 3;

  /**
   * Table separator.
   */
  doc
    .strokeColor(
      "#000000",
    )
    .lineWidth(0.75)
    .moveTo(
      ml,
      y,
    )
    .lineTo(
      mr,
      y,
    )
    .stroke();

  y += 6;

  /**
   * ============================================================
   * TABLE HEADER
   * ============================================================
   */

  y =
    renderTableHeader(
      doc,
      y,
    );

  /**
   * ============================================================
   * TABLE ROWS
   * ============================================================
   */

  let grandTotal =
    0;

  lines.forEach(
    (
      row,
      idx,
    ) => {
      /**
       * Page break.
       */
      if (
        y >
        doc.page.height -
          doc.page.margins
            .bottom -
          FOOTER_RESERVE
      ) {
        doc.addPage();

        ({
          ml,
          mr,
          mw,
        } =
          pageInnerBounds(
            doc,
          ));

        y =
          doc.page.margins.top;

        y =
          renderTableHeader(
            doc,
            y,
          );
      }

      const T =
        tableLayout(doc);

      const lineTotal =
        pfPartnerLineTotal(
          row.qtyPartner,
          row.unitPricePartner,
          row.pph,
          row.taxIn,
        );

      if (
        lineTotal != null
      ) {
        grandTotal +=
          lineTotal;
      }

      const siteId =
        row.detailSiteId?.trim() ||
        "—";

      const siteName =
        row.partnerDocumentWorkLocation?.trim() ||
        row.detailSiteName?.trim() ||
        "—";

      const material =
        row.detailMaterialName?.trim() ||
        "—";

      /**
       * Calculate row height.
       */
      const siteIdHeight =
        doc.heightOfString(
          siteId,
          {
            width:
              T.wSiteId,
            lineGap: 1,
          },
        );

      const siteNameHeight =
        doc.heightOfString(
          siteName,
          {
            width:
              T.wSite,
            lineGap: 1,
          },
        );

      const materialHeight =
        doc.heightOfString(
          material,
          {
            width:
              T.wMat,
            lineGap: 1,
          },
        );

      const rowHeight =
        Math.max(
          siteIdHeight,
          siteNameHeight,
          materialHeight,
          11,
        );

      doc
        .fillColor(
          "#000000",
        )
        .font(
          "Helvetica",
        )
        .fontSize(8);

      /**
       * No.
       */
      doc.text(
        String(
          idx + 1,
        ),
        T.c0,
        y,
        {
          width:
            T.wNo,

          align:
            "center",
        },
      );

            /**
       * Material.
       */
      doc.text(
        material,
        T.c1,
        y,
        {
          width:
            T.wMat,
          lineGap: 1,
        },
      );

      /**
       * Site ID.
       */
      doc.text(
        siteId,
        T.c2,
        y,
        {
          width:
            T.wSiteId,
          lineGap: 1,
        },
      );

      /**
       * Details / Site.
       */
      doc.text(
        siteName,
        T.c3,
        y,
        {
          width:
            T.wSite,
          lineGap: 1,
        },
      );



      /**
       * Qty.
       */
      doc.text(
        fmtQty(
          row.qtyPartner,
        ),
        T.c4,
        y,
        {
          width:
            T.wQty,

          align:
            "right",
        },
      );

      /**
       * Unit Price.
       */
      const unitPrice =
        pfParseNum(
          row.unitPricePartner,
        );

      doc.text(
        unitPrice != null
          ? idr(
              unitPrice,
            )
          : "—",
        T.c5,
        y,
        {
          width:
            T.wUnit,

          align:
            "right",
        },
      );

      /**
       * Total Price.
       */
      doc.text(
        lineTotal != null
          ? idr(
              lineTotal,
            )
          : "—",
        T.c6,
        y,
        {
          width:
            T.wAmt,

          align:
            "right",
        },
      );

      y +=
        rowHeight +
        3;
    },
  );

  /**
   * ============================================================
   * GRAND TOTAL
   * ============================================================
   */

  let T =
    tableLayout(doc);

  doc
    .strokeColor(
      "#000000",
    )
    .lineWidth(
      0.75,
    )
    .moveTo(
      T.ml,
      y,
    )
    .lineTo(
      T.mr,
      y,
    )
    .stroke();

  y += 6;

  doc
    .fillColor(
      "#000000",
    )
    .font(
      "Helvetica-Bold",
    )
    .fontSize(10)
    .text(
      `Total: ${idr(
        grandTotal,
      )}`,
      T.ml,
      y,
      {
        width:
          T.mw,

        align:
          "right",
      },
    );

  y += 28;

  /**
   * ============================================================
   * SIGNATURE AREA
   * ============================================================
   */

  T =
    tableLayout(doc);

  if (
    y >
    doc.page.height -
      doc.page.margins
        .bottom -
      FOOTER_RESERVE
  ) {
    doc.addPage();

    y =
      doc.page.margins.top;

    T =
      tableLayout(doc);
  }

  const footY = y;

  /**
   * ============================================================
   * SIGNATURE COLUMN CONFIG
   * ============================================================
   */

  const signatureColumnWidth =
    T.mw *
    0.48;

  const leftColumnX =
    T.ml;

  const rightColumnX =
    T.mr -
    signatureColumnWidth;

  /**
   * ============================================================
   * SIGNATURE HEADERS
   * ============================================================
   */

  doc
    .fillColor(
      "#000000",
    )
    .font(
      "Helvetica-Bold",
    )
    .fontSize(9);

  /**
   * Kopindosat.
   */
  doc.text(
    "Kopindosat",
    leftColumnX,
    footY,
    {
      width:
        signatureColumnWidth,

      align:
        "left",

      lineBreak:
        false,
    },
  );

  /**
   * Partner.
   */
  doc.text(
    "Partner",
    rightColumnX,
    footY,
    {
      width:
        signatureColumnWidth,

      align:
        "right",

      lineBreak:
        false,
    },
  );

  /**
   * ============================================================
   * SPECIMEN POSITION
   * ============================================================
   */

  const specimenY =
    footY +
    SIGNATURE_TOP_SPACE;

  /**
   * ============================================================
   * KOPINDOSAT SPECIMEN
   *
   * Nama
   * ─────────────
   * Title
   * ============================================================
   */

  renderSignatureSpecimen(
    doc,
    {
      columnX:
        leftColumnX,

      columnWidth:
        signatureColumnWidth,

      y:
        specimenY,

      name:
        meta
          .kopindosatSignatoryName
          ?.trim() ||
        "",

      title:
        meta
          .kopindosatSignatoryTitle
          ?.trim() ||
        "",

      align:
        "left",
    },
  );

  /**
   * ============================================================
   * PARTNER SPECIMEN
   *
   * Nama
   * ─────────────
   * Title
   * ============================================================
   */

  renderSignatureSpecimen(
    doc,
    {
      columnX:
        rightColumnX,

      columnWidth:
        signatureColumnWidth,

      y:
        specimenY,

      name:
        meta.signatoryName?.trim() ||
        "",

      title:
        meta.signatoryTitle?.trim() ||
        "",

      align:
        "right",
    },
  );

  /**
   * ============================================================
   * FINISH
   * ============================================================
   */

  doc.end();

  return done;
}
