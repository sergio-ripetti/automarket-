import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Sale } from './salesService'
import { getVehicleColourName } from './colorNames'

// Module augmentation for jsPDF to add lastAutoTable property
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number
    }
  }
}

// AutoMarket brand palette, matching the app's real light/card-based UI (see AdminSaleDetail.tsx,
// Footer.tsx) rather than the old dark/amber theme this invoice previously used.
const COLOR = {
  charcoal: [13, 27, 42] as [number, number, number], // #0D1B2A - headings
  text: [26, 26, 26] as [number, number, number], // #1A1A1A - primary body text
  gray: [118, 118, 118] as [number, number, number], // #767676 - secondary/label text
  border: [224, 224, 220] as [number, number, number], // #E0E0DC
  cardBg: [249, 250, 251] as [number, number, number], // #F9FAFB - soft section background
  lime: [196, 255, 0] as [number, number, number], // #C4FF00 - brand accent
  white: [255, 255, 255] as [number, number, number],
}

const DEALERSHIP = {
  name: 'AutoMarket NZ',
  address: '123 Queen Street, Auckland CBD',
  phone: '+64 9 123 4567',
  email: 'contact@automarket.co.nz',
}

function fmt(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Type-safe wrapper to get the final Y position after autoTable
function getAutoTableFinalY(doc: jsPDF): number {
  if (!doc.lastAutoTable) {
    throw new Error('autoTable has not been called yet')
  }
  return doc.lastAutoTable.finalY
}

function formatPaymentSchedule(sale: Sale, maxRows: number = 6): Array<[string, string, string, string]> {
  return sale.payments.slice(0, maxRows).map((p, idx) => [
    String(idx + 1),
    fmtDate(p.dueDate),
    fmt(p.amount),
    p.status === 'paid' ? 'Paid' : p.status === 'overdue' ? 'Overdue' : 'Pending',
  ])
}

// A section heading with a lime accent underline spanning the full width of the heading text,
// matching the app's restrained-accent style rather than a full-width colored bar.
function sectionTitle(doc: jsPDF, title: string, x: number, y: number): number {
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.charcoal)
  const label = title.toUpperCase()
  doc.text(label, x, y)
  const labelWidth = doc.getTextWidth(label)
  doc.setDrawColor(...COLOR.lime)
  doc.setLineWidth(1)
  doc.line(x, y + 2, x + labelWidth, y + 2)
  return y + 9
}

// Shared table styling: light card background, subtle borders, charcoal/gray text - used for
// every data table in the document so the whole invoice reads as one consistent design system.
function plainTableStyle() {
  return {
    theme: 'plain' as const,
    styles: { font: 'Helvetica', fontSize: 9.5, textColor: COLOR.text, cellPadding: 2.2 },
    headStyles: {
      fontStyle: 'bold' as const,
      textColor: COLOR.charcoal,
      fillColor: COLOR.cardBg,
      lineColor: COLOR.border,
      lineWidth: 0.3,
    },
    bodyStyles: {
      textColor: COLOR.text,
      fillColor: COLOR.white,
      lineColor: COLOR.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: COLOR.cardBg },
  }
}

// Builds a two-page PDF invoice (sale details, ORC, accessories, financing, payment schedule, consumer notice) from a Sale record and triggers a browser download via jsPDF
export function generateInvoice(sale: Sale): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - 2 * margin
  const invNumber = `INV-${sale.id.substring(0, 8).toUpperCase()}`

  // ──── HEADER ────
  // Brand mark: a simplified car-silhouette icon (matching the Navbar logo) followed by the
  // "AUTO" (lime) + "MARKET" (charcoal) wordmark, so the invoice reads as the same brand
  // identity used across the site header/home page.
  const iconX = margin
  const iconY = 10
  const iconScale = 0.55
  doc.setDrawColor(...COLOR.lime)
  doc.setFillColor(...COLOR.lime)
  doc.setLineWidth(iconScale)
  doc.lines(
    [
      [3 * iconScale, -8 * iconScale],
      [22 * iconScale, 0],
      [3 * iconScale, 8 * iconScale],
    ],
    iconX + 2 * iconScale,
    iconY + 14 * iconScale,
    [1, 1],
    'S',
  )
  doc.roundedRect(iconX, iconY + 14 * iconScale, 30 * iconScale, 4 * iconScale, 0.6, 0.6, 'F')
  doc.circle(iconX + 8 * iconScale, iconY + 18 * iconScale, 2 * iconScale, 'F')
  doc.circle(iconX + 24 * iconScale, iconY + 18 * iconScale, 2 * iconScale, 'F')

  const wordmarkX = iconX + 34 * iconScale
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...COLOR.lime)
  doc.text('AUTO', wordmarkX, 22)
  const autoWidth = doc.getTextWidth('AUTO')
  doc.setTextColor(...COLOR.charcoal)
  doc.text('MARKET', wordmarkX + autoWidth, 22)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text('VEHICLE SALES INVOICE', margin, 29)

  // Right-aligned invoice meta
  const rightX = pageWidth - margin
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text('Invoice No.', rightX, 15, { align: 'right' })
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.charcoal)
  doc.text(invNumber, rightX, 20.5, { align: 'right' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text(`Issued ${fmtDate(sale.saleDate)}`, rightX, 27, { align: 'right' })

  // Status pill (top-right)
  const statusLabel = sale.status.toUpperCase()
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8)
  const statusWidth = doc.getTextWidth(statusLabel) + 6
  doc.setFillColor(...COLOR.cardBg)
  doc.setDrawColor(...COLOR.border)
  doc.roundedRect(rightX - statusWidth, 30, statusWidth, 6, 1.2, 1.2, 'FD')
  doc.setTextColor(...COLOR.charcoal)
  doc.text(statusLabel, rightX - statusWidth / 2, 34, { align: 'center' })

  // Divider under header
  doc.setDrawColor(...COLOR.border)
  doc.setLineWidth(0.3)
  doc.line(margin, 42, pageWidth - margin, 42)

  let yPos = 52

  // ──── BUYER + DEALERSHIP (two-column) ────
  const colGap = 6
  const colWidth = (contentWidth - colGap) / 2
  const infoStartY = yPos

  yPos = sectionTitle(doc, 'Buyer Information', margin, yPos)
  const buyerData = [
    ['Full Name', sale.buyer.name],
    ['Email', sale.buyer.email],
    ['Phone', sale.buyer.phone],
    ['Address', sale.buyer.address],
    ['Driver Licence', sale.buyer.licenseNumber],
  ]
  autoTable(doc, {
    startY: yPos,
    body: buyerData,
    margin: { left: margin, right: pageWidth - margin - colWidth },
    tableWidth: colWidth,
    ...plainTableStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLOR.gray, cellWidth: colWidth * 0.36 },
      1: { textColor: COLOR.text, cellWidth: colWidth * 0.64 },
    },
  })
  const buyerEndY = getAutoTableFinalY(doc)

  const dealerX = margin + colWidth + colGap
  let dealerY = sectionTitle(doc, 'Dealership', dealerX, infoStartY)
  const dealerData = [
    ['Dealer', DEALERSHIP.name],
    ['Address', DEALERSHIP.address],
    ['Phone', DEALERSHIP.phone],
    ['Email', DEALERSHIP.email],
  ]
  autoTable(doc, {
    startY: dealerY,
    body: dealerData,
    margin: { left: dealerX, right: margin },
    tableWidth: colWidth,
    ...plainTableStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLOR.gray, cellWidth: colWidth * 0.36 },
      1: { textColor: COLOR.text, cellWidth: colWidth * 0.64 },
    },
  })
  dealerY = getAutoTableFinalY(doc)

  yPos = Math.max(buyerEndY, dealerY) + 8

  // ──── VEHICLE DETAILS (core section, given visual weight) ────
  yPos = sectionTitle(doc, 'Vehicle Details', margin, yPos)

  const vehicleData: Array<[string, string]> = [
    ['Vehicle', sale.carTitle],
    ['Make / Model', `${sale.carBrand} ${sale.carModel}`],
    ['Year', String(sale.carYear)],
    ['Colour', getVehicleColourName(sale.carColor)],
    ['VIN / Chassis No.', sale.vehicleInfo.vin],
    ['Licence Plate', sale.vehicleInfo.plate],
    ['Vehicle Origin', sale.vehicleInfo.isNZNew ? 'NZ New' : 'Used Import'],
  ]
  if (!sale.vehicleInfo.isNZNew) {
    vehicleData.push(['Country of Origin', sale.vehicleInfo.originCountry])
  }
  vehicleData.push(['Previous Owners', String(sale.vehicleInfo.previousOwners)])
  vehicleData.push(['Maintenance History', sale.vehicleInfo.hasMaintenanceHistory ? 'Available' : 'Not available'])

  autoTable(doc, {
    startY: yPos,
    body: vehicleData,
    margin: { left: margin, right: margin },
    ...plainTableStyle(),
    columnStyles: {
      0: { fontStyle: 'bold', textColor: COLOR.gray, cellWidth: contentWidth * 0.32 },
      1: { textColor: COLOR.text, cellWidth: contentWidth * 0.68 },
    },
  })
  yPos = getAutoTableFinalY(doc) + 10

  // Ensures a section that's about to start has enough room on the current page before its
  // heading is drawn, so a title never gets stranded alone at the bottom of a page.
  const ensureSpace = (needed: number) => {
    if (yPos + needed > pageHeight - 30) {
      doc.addPage()
      yPos = 20
    }
  }

  // ──── ORC SECTION ────
  if (sale.orc && (sale.orc.orcTotal > 0 || sale.orc.orcIncluded)) {
    ensureSpace(30)
    yPos = sectionTitle(doc, 'On Road Costs', margin, yPos)

    const orcData: Array<[string, string]> = []
    if (sale.orc.orcIncluded) {
      orcData.push(['ORC Status', 'Included in vehicle price'])
    } else {
      if (sale.orc.wof > 0) orcData.push(['Warrant of Fitness (WoF)', fmt(sale.orc.wof)])
      if (sale.orc.registration > 0) orcData.push([`Registration (${sale.orc.registrationMonths}m)`, fmt(sale.orc.registration)])
      if (sale.orc.grooming > 0) orcData.push(['Grooming / Detailing', fmt(sale.orc.grooming)])
      if (sale.orc.ownershipTransfer > 0) orcData.push(['Ownership Transfer', fmt(sale.orc.ownershipTransfer)])
      if (sale.orc.mechanicalInspection > 0) orcData.push(['Mechanical Inspection', fmt(sale.orc.mechanicalInspection)])
      if (sale.orc.otherAmount > 0) orcData.push([sale.orc.otherLabel || 'Other', fmt(sale.orc.otherAmount)])
      orcData.push(['ORC Total', fmt(sale.orc.orcTotal)])
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: orcData,
      margin: { left: margin, right: margin },
      ...plainTableStyle(),
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      },
    })
    yPos = getAutoTableFinalY(doc) + 8
  }

  // ──── ACCESSORIES SECTION ────
  if (sale.extraAccessories && sale.extraAccessories.items.length > 0) {
    ensureSpace(30)
    yPos = sectionTitle(doc, 'Extra Accessories', margin, yPos)

    const accessoriesData: Array<[string, string]> = sale.extraAccessories.items.map((item) => [
      item.description,
      fmt(item.price),
    ])
    accessoriesData.push(['Accessories Total', fmt(sale.extraAccessories.total)])

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: accessoriesData,
      margin: { left: margin, right: margin },
      ...plainTableStyle(),
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      },
    })
    yPos = getAutoTableFinalY(doc) + 8
  }

  // ──── FINANCING FEES SECTION ────
  if (sale.financingFees) {
    ensureSpace(30)
    yPos = sectionTitle(doc, 'Financing Fees', margin, yPos)

    const feesData: Array<[string, string]> = [
      ['Establishment Fee', fmt(sale.financingFees.establishmentFee)],
      ['PPSR Fee', fmt(sale.financingFees.ppsr)],
      ['Monthly Account Fee', fmt(sale.financingFees.monthlyAccountFee)],
      ['Dealer Origination Fee', fmt(sale.financingFees.dealerOriginationFee)],
      ['Financing Fees Total', fmt(sale.financingFees.total)],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: feesData,
      margin: { left: margin, right: margin },
      ...plainTableStyle(),
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      },
    })
    yPos = getAutoTableFinalY(doc) + 8
  }

  // ──── WARRANTY & INSURANCE SECTION ────
  if (sale.warranty || sale.mechanicalInsurance) {
    ensureSpace(30)
    yPos = sectionTitle(doc, 'Warranty & Insurance', margin, yPos)

    const warrantyData: Array<[string, string]> = []
    if (sale.warranty) {
      warrantyData.push(['Mechanical Warranty', `${sale.warranty.months} months - ${sale.warranty.provider}`])
    }
    if (sale.mechanicalInsurance) {
      warrantyData.push(['Mechanical Insurance', `${sale.mechanicalInsurance.months} months - ${sale.mechanicalInsurance.provider}`])
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Coverage', 'Details']],
      body: warrantyData,
      margin: { left: margin, right: margin },
      ...plainTableStyle(),
      columnStyles: {
        0: { cellWidth: contentWidth * 0.4 },
        1: { cellWidth: contentWidth * 0.6 },
      },
    })
    yPos = getAutoTableFinalY(doc) + 8
  }

  // ──── FINANCIAL SUMMARY (grand total emphasized) ────
  ensureSpace(45)
  yPos = sectionTitle(doc, 'Payment Summary', margin, yPos)

  const orcTotal = sale.orc.orcIncluded ? 0 : sale.orc.orcTotal
  const accessoriesTotal = sale.extraAccessories?.total || 0
  const financingFeesTotal = sale.financingFees?.total || 0
  const subtotal = sale.paymentPlan.salePrice + orcTotal + accessoriesTotal + financingFeesTotal
  const gst = Math.round(subtotal * 0.15)
  const totalPayable = subtotal + gst

  const financialData: Array<[string, string]> = [
    ['Vehicle Price', fmt(sale.paymentPlan.salePrice)],
  ]
  if (orcTotal > 0) {
    financialData.push(['On Road Costs', fmt(orcTotal)])
  } else if (sale.orc.orcIncluded) {
    financialData.push(['On Road Costs', 'Included'])
  }
  if (accessoriesTotal > 0) financialData.push(['Accessories', fmt(accessoriesTotal)])
  if (financingFeesTotal > 0) financialData.push(['Financing Fees', fmt(financingFeesTotal)])
  financialData.push(['Payment Method', paymentMethodLabel(sale.paymentPlan.type)])
  if (sale.paymentPlan.type !== 'cash') {
    financialData.push(['Deposit / Down Payment', fmt(sale.paymentPlan.downPayment)])
  }
  financialData.push(['Subtotal', fmt(subtotal)])
  financialData.push(['GST (15%)', fmt(gst)])

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: financialData,
    margin: { left: margin, right: margin },
    ...plainTableStyle(),
    columnStyles: {
      0: { cellWidth: contentWidth * 0.65 },
      1: { cellWidth: contentWidth * 0.35, halign: 'right' },
    },
  })
  yPos = getAutoTableFinalY(doc) + 3

  // Grand total - visually the strongest element on the page
  const totalBoxH = 12
  doc.setFillColor(...COLOR.charcoal)
  doc.roundedRect(margin, yPos, contentWidth, totalBoxH, 1.5, 1.5, 'F')
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.lime)
  doc.text('TOTAL PAYABLE', margin + 5, yPos + totalBoxH / 2 + 1.5)
  doc.setFontSize(13)
  doc.setTextColor(...COLOR.white)
  doc.text(fmt(totalPayable), pageWidth - margin - 5, yPos + totalBoxH / 2 + 1.8, { align: 'right' })
  yPos += totalBoxH + 10

  // ──── FINANCING PLAN (or a clean "cash sale" note) ────
  ensureSpace(45)
  if (sale.paymentPlan.type !== 'cash') {
    yPos = sectionTitle(doc, 'Financing Plan', margin, yPos)

    const financingData = [
      ['Amount Financed', fmt(sale.paymentPlan.financedAmount)],
      ['Interest Rate (Monthly)', `${(sale.paymentPlan.monthlyRate / 12).toFixed(2)}%`],
      ['Loan Term', `${sale.paymentPlan.termMonths} months`],
      ['Monthly Payment', fmt(sale.paymentPlan.monthlyPayment)],
      ['Total Repayment', fmt(sale.paymentPlan.totalPayment)],
      ['Total Interest', fmt(sale.paymentPlan.totalInterest)],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount']],
      body: financingData,
      margin: { left: margin, right: margin },
      ...plainTableStyle(),
      columnStyles: {
        0: { cellWidth: contentWidth * 0.65 },
        1: { cellWidth: contentWidth * 0.35, halign: 'right' },
      },
    })
    yPos = getAutoTableFinalY(doc) + 8

    if (sale.payments.length > 0) {
      ensureSpace(40)
      yPos = sectionTitle(doc, 'Payment Schedule (First 6 Months)', margin, yPos)

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Due Date', 'Amount', 'Status']],
        body: formatPaymentSchedule(sale, 6),
        margin: { left: margin, right: margin },
        ...plainTableStyle(),
        columnStyles: {
          0: { cellWidth: contentWidth * 0.12 },
          1: { cellWidth: contentWidth * 0.3 },
          2: { cellWidth: contentWidth * 0.28, halign: 'right' },
          3: { cellWidth: contentWidth * 0.3 },
        },
      })
      yPos = getAutoTableFinalY(doc) + 8
    }
  } else {
    doc.setFont('Helvetica', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(...COLOR.gray)
    doc.text('Paid in full by cash - no financing applied to this sale.', margin, yPos)
    yPos += 10
  }

  // ──── NOTES (only if present) ────
  if (sale.notes && sale.notes.trim().length > 0) {
    ensureSpace(30)
    yPos = sectionTitle(doc, 'Notes', margin, yPos)
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...COLOR.text)
    const noteLines = doc.splitTextToSize(sale.notes, contentWidth)
    doc.text(noteLines, margin, yPos)
    yPos += noteLines.length * 4.5 + 4
  }

  // ──── PAGE 2: CONSUMER INFORMATION NOTICE (CIN) ────
  doc.addPage()
  yPos = 22

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...COLOR.charcoal)
  doc.text('Consumer Information Notice', margin, yPos)
  doc.setDrawColor(...COLOR.lime)
  doc.setLineWidth(1)
  doc.line(margin, yPos + 2, margin + 24, yPos + 2)
  yPos += 9

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text('Required under NZ Consumer Law for all used vehicles', margin, yPos)
  yPos += 8

  const cinData: Array<[string, string]> = [
    ['Vehicle Origin', sale.vehicleInfo.isNZNew ? 'NZ New' : 'Used Import'],
    ['Country of Origin', sale.vehicleInfo.originCountry],
    ['Number of Previous Owners', String(sale.vehicleInfo.previousOwners)],
    ['VIN / Chassis Number', sale.vehicleInfo.vin],
    ['Licence Plate', sale.vehicleInfo.plate],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Field', 'Details']],
    body: cinData,
    margin: { left: margin, right: margin },
    ...plainTableStyle(),
    columnStyles: {
      0: { cellWidth: contentWidth * 0.4 },
      1: { cellWidth: contentWidth * 0.6 },
    },
  })
  yPos = getAutoTableFinalY(doc) + 12

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text(
    'This notice is required to be displayed with all used vehicles for sale in New Zealand.',
    margin,
    yPos,
  )

  // Drawn last, once all content/pages exist, so the page count reflects every physical page
  // (content can overflow onto extra pages via ensureSpace or autoTable) and no page is skipped
  // or mislabeled.
  writeAllFooters(doc, drawFooter)

  // Download
  const filename = `Invoice_${invNumber}_${sale.buyer.name.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}

// Iterates every physical page currently in the document (determined only after all content has
// been generated) and invokes `draw` with a 1-indexed page number and the true total page count.
// Extracted from generateInvoice so the numbering loop itself can be unit tested independent of
// full PDF generation.
export function writeAllFooters(
  doc: jsPDF,
  draw: (doc: jsPDF, page: number, totalPages: number) => void,
): void {
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    draw(doc, page, totalPages)
  }
}

function paymentMethodLabel(type: Sale['paymentPlan']['type']): string {
  if (type === 'cash') return 'Cash'
  if (type === 'financing') return 'Financing'
  return 'Cash + Financing (Mixed)'
}

// Consistent, minimal footer used on every page.
function drawFooter(doc: jsPDF, page: number, totalPages: number): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerY = pageHeight - 20

  doc.setDrawColor(...COLOR.border)
  doc.setLineWidth(0.3)
  doc.line(18, footerY - 4, pageWidth - 18, footerY - 4)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR.charcoal)
  doc.text('Thank you for choosing AutoMarket', pageWidth / 2, footerY, { align: 'center' })

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...COLOR.gray)
  doc.text(
    `${DEALERSHIP.email}  |  ${DEALERSHIP.phone}  |  ${DEALERSHIP.address}`,
    pageWidth / 2,
    footerY + 4.5,
    { align: 'center' },
  )
  doc.text('Generated by AutoMarket', pageWidth / 2, footerY + 9, { align: 'center' })

  doc.setFontSize(7.5)
  doc.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
}
