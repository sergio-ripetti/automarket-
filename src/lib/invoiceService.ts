import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Sale } from './salesService'

function fmt(price: number): string {
  return price.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatPaymentSchedule(sale: Sale, maxRows: number = 6): Array<[string, string, string, string]> {
  return sale.payments.slice(0, maxRows).map((p, idx) => [
    String(idx + 1),
    fmtDate(p.dueDate),
    fmt(p.amount),
    p.status === 'paid' ? 'Paid' : p.status === 'overdue' ? 'Overdue' : 'Pending',
  ])
}

// Builds a two-page PDF invoice (sale details, ORC, accessories, financing, payment schedule, consumer notice) from a Sale record and triggers a browser download via jsPDF
export function generateInvoice(sale: Sale): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPos = 70

  // ──── HEADER ────
  // LEFT SIDE
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(245, 158, 11)
  doc.text('AutoMarket', 20, 20)

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(102, 102, 102)
  doc.text('Vehicle Sale Invoice', 20, 32)

  doc.setFontSize(10)
  doc.setTextColor(68, 68, 68)
  doc.text(`Date: ${fmtDate(sale.saleDate)}`, 20, 44)

  const invNumber = `INV-${sale.id.substring(0, 8).toUpperCase()}`
  doc.text(`Status: ${sale.status.toUpperCase()}`, 20, 52)

  // RIGHT SIDE
  doc.setFontSize(10)
  doc.setTextColor(102, 102, 102)
  doc.text('Invoice #', 130, 20)

  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(51, 51, 51)
  doc.text(invNumber, 130, 28)

  // Divider line
  doc.setDrawColor(245, 158, 11)
  doc.setLineWidth(0.5)
  doc.line(20, 60, 190, 60)

  // ──── VEHICLE DETAILS ────
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(245, 158, 11)
  doc.text('Vehicle Details', margin, yPos)
  yPos += 6

  const vehicleData: Array<[string, string]> = [
    ['Make/Brand', sale.carBrand],
    ['Model', sale.carModel],
    ['Year', String(sale.carYear)],
    ['Color', sale.carColor],
    ['Title', sale.carTitle],
    ['VIN / Chassis Number', sale.vehicleInfo.vin],
    ['License Plate', sale.vehicleInfo.plate],
    ['Vehicle Origin', sale.vehicleInfo.isNZNew ? 'NZ New' : 'Used Import'],
  ]

  if (!sale.vehicleInfo.isNZNew) {
    vehicleData.push(['Country of Origin', sale.vehicleInfo.originCountry])
  }

  vehicleData.push(['Previous Owners', String(sale.vehicleInfo.previousOwners)])
  vehicleData.push(['Maintenance History', sale.vehicleInfo.hasMaintenanceHistory ? 'Yes' : 'No'])

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: vehicleData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [128, 128, 128], cellWidth: contentWidth * 0.3 },
      1: { textColor: [255, 255, 255], cellWidth: contentWidth * 0.7 },
    },
    bodyStyles: {
      textColor: [255, 255, 255],
      fillColor: [15, 15, 15],
    } as any,
    rowPageBreak: 'avoid',
    didDrawPage: undefined,
  })

  yPos = (doc as any).lastAutoTable.finalY + 8

  // ──── ORC SECTION ────
  if (sale.orc && (sale.orc.orcTotal > 0 || sale.orc.orcIncluded)) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(245, 158, 11)
    doc.text('On Road Costs (ORC)', margin, yPos)
    yPos += 6

    const orcData: Array<[string, string]> = []
    if (sale.orc.orcIncluded) {
      orcData.push(['ORC Status', 'Included in Vehicle Price'])
    } else {
      if (sale.orc.wof > 0) orcData.push(['Warrant of Fitness (WoF)', fmt(sale.orc.wof)])
      if (sale.orc.registration > 0) orcData.push(['Registration (' + sale.orc.registrationMonths + 'm)', fmt(sale.orc.registration)])
      if (sale.orc.grooming > 0) orcData.push(['Grooming/Detailing', fmt(sale.orc.grooming)])
      if (sale.orc.ownershipTransfer > 0) orcData.push(['Ownership Transfer', fmt(sale.orc.ownershipTransfer)])
      if (sale.orc.mechanicalInspection > 0) orcData.push(['Mechanical Inspection', fmt(sale.orc.mechanicalInspection)])
      if (sale.orc.otherAmount > 0) orcData.push([sale.orc.otherLabel || 'Other', fmt(sale.orc.otherAmount)])
      orcData.push(['ORC TOTAL', fmt(sale.orc.orcTotal)])
    }

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount (NZD)']],
      body: orcData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        textColor: [245, 158, 11],
        fillColor: [15, 15, 15],
        lineColor: [245, 158, 11],
        lineWidth: 0.5,
      },
      bodyStyles: {
        textColor: [255, 255, 255],
        fillColor: [15, 15, 15],
        lineColor: [100, 100, 100],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.6 },
        1: { cellWidth: contentWidth * 0.4, halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // ──── ACCESSORIES SECTION ────
  if (sale.extraAccessories && sale.extraAccessories.items.length > 0) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(245, 158, 11)
    doc.text('Extra Accessories', margin, yPos)
    yPos += 6

    const accessoriesData: Array<[string, string]> = sale.extraAccessories.items.map((item) => [
      item.description,
      fmt(item.price),
    ])
    accessoriesData.push(['ACCESSORIES TOTAL', fmt(sale.extraAccessories.total)])

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount (NZD)']],
      body: accessoriesData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        textColor: [245, 158, 11],
        fillColor: [15, 15, 15],
        lineColor: [245, 158, 11],
        lineWidth: 0.5,
      },
      bodyStyles: {
        textColor: [255, 255, 255],
        fillColor: [15, 15, 15],
        lineColor: [100, 100, 100],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.6 },
        1: { cellWidth: contentWidth * 0.4, halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // ──── FINANCING FEES SECTION ────
  if (sale.financingFees) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(245, 158, 11)
    doc.text('Financing Fees', margin, yPos)
    yPos += 6

    const feesData: Array<[string, string]> = [
      ['Establishment Fee', fmt(sale.financingFees.establishmentFee)],
      ['PPSR Fee', fmt(sale.financingFees.ppsr)],
      ['Monthly Account Fee', fmt(sale.financingFees.monthlyAccountFee)],
      ['Dealer Origination Fee', fmt(sale.financingFees.dealerOriginationFee)],
      ['FINANCING FEES TOTAL', fmt(sale.financingFees.total)],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [['Description', 'Amount (NZD)']],
      body: feesData,
      margin: { left: margin, right: margin },
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        textColor: [245, 158, 11],
        fillColor: [15, 15, 15],
        lineColor: [245, 158, 11],
        lineWidth: 0.5,
      },
      bodyStyles: {
        textColor: [255, 255, 255],
        fillColor: [15, 15, 15],
        lineColor: [100, 100, 100],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.6 },
        1: { cellWidth: contentWidth * 0.4, halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // ──── WARRANTY & INSURANCE SECTION ────
  if (sale.warranty || sale.mechanicalInsurance) {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(245, 158, 11)
    doc.text('Warranty & Insurance', margin, yPos)
    yPos += 6

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
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        textColor: [245, 158, 11],
        fillColor: [15, 15, 15],
        lineColor: [245, 158, 11],
        lineWidth: 0.5,
      },
      bodyStyles: {
        textColor: [255, 255, 255],
        fillColor: [15, 15, 15],
        lineColor: [100, 100, 100],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.4 },
        1: { cellWidth: contentWidth * 0.6 },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // ──── BUYER DETAILS ────
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(245, 158, 11)
  doc.text('Buyer Information', margin, yPos)
  yPos += 6

  const buyerData = [
    ['Full Name', sale.buyer.name],
    ['ID Number', sale.buyer.idNumber],
    ['Driver License', sale.buyer.licenseNumber],
    ['Email', sale.buyer.email],
    ['Phone', sale.buyer.phone],
    ['Address', sale.buyer.address],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: buyerData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [128, 128, 128], cellWidth: contentWidth * 0.3 },
      1: { textColor: [255, 255, 255], cellWidth: contentWidth * 0.7 },
    },
    bodyStyles: {
      textColor: [255, 255, 255],
      fillColor: [15, 15, 15],
    } as any,
    rowPageBreak: 'avoid',
  })

  yPos = (doc as any).lastAutoTable.finalY + 8

  // ──── FINANCIAL SUMMARY TABLE ────
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(245, 158, 11)
  doc.text('Financial Summary', margin, yPos)
  yPos += 6

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
    financialData.push(['ORC', fmt(orcTotal)])
  } else if (sale.orc.orcIncluded) {
    financialData.push(['ORC', 'Included'])
  }

  if (accessoriesTotal > 0) {
    financialData.push(['Accessories', fmt(accessoriesTotal)])
  }

  if (financingFeesTotal > 0) {
    financialData.push(['Financing Fees', fmt(financingFeesTotal)])
  }

  financialData.push(['Subtotal', fmt(subtotal)])
  financialData.push(['GST (15%)', fmt(gst)])
  financialData.push(['TOTAL PAYABLE', fmt(totalPayable)])

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount (NZD)']],
    body: financialData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: {
      fontStyle: 'bold',
      textColor: [245, 158, 11],
      fillColor: [15, 15, 15],
      lineColor: [245, 158, 11],
      lineWidth: 0.5,
    },
    bodyStyles: {
      textColor: [255, 255, 255],
      fillColor: [15, 15, 15],
      lineColor: [100, 100, 100],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.6 },
      1: { cellWidth: contentWidth * 0.4, halign: 'right' },
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 8

  // ──── FINANCING PLAN (if applicable) ────
  if (sale.paymentPlan.type !== 'cash') {
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(245, 158, 11)
    doc.text('Financing Plan', margin, yPos)
    yPos += 6

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
      theme: 'plain',
      headStyles: {
        fontStyle: 'bold',
        textColor: [245, 158, 11],
        fillColor: [15, 15, 15],
        lineColor: [245, 158, 11],
        lineWidth: 0.5,
      },
      bodyStyles: {
        textColor: [255, 255, 255],
        fillColor: [15, 15, 15],
        lineColor: [100, 100, 100],
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.6 },
        1: { cellWidth: contentWidth * 0.4, halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8

    // Payment Schedule
    if (sale.payments.length > 0) {
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Payment Schedule (First 6 Months)', margin, yPos)
      yPos += 6

      const scheduleData = formatPaymentSchedule(sale, 6)

      autoTable(doc, {
        startY: yPos,
        head: [['Payment #', 'Due Date', 'Amount', 'Status']],
        body: scheduleData,
        margin: { left: margin, right: margin },
        theme: 'plain',
        headStyles: {
          fontStyle: 'bold',
          textColor: [245, 158, 11],
          fillColor: [15, 15, 15],
          lineColor: [245, 158, 11],
          lineWidth: 0.5,
        },
        bodyStyles: {
          textColor: [255, 255, 255],
          fillColor: [15, 15, 15],
          lineColor: [100, 100, 100],
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { cellWidth: contentWidth * 0.15 },
          1: { cellWidth: contentWidth * 0.25 },
          2: { cellWidth: contentWidth * 0.3, halign: 'right' },
          3: { cellWidth: contentWidth * 0.3 },
        },
      })

      yPos = (doc as any).lastAutoTable.finalY
    }
  }

  // ──── FOOTER (Page 1) ────
  let footerY = doc.internal.pageSize.getHeight() - 25
  doc.setFontSize(9)
  doc.setTextColor(128, 128, 128)
  doc.setFont('Helvetica', 'normal')
  doc.text('Thank you for your business - AutoMarket NZ', pageWidth / 2, footerY, { align: 'center' })
  doc.text('contact@automarket.co.nz | +64 9 123 4567 | 123 Queen Street Auckland', pageWidth / 2, footerY + 5, { align: 'center' })
  doc.text('This document serves as an official receipt of sale', pageWidth / 2, footerY + 10, { align: 'center' })

  // Page number (Page 1 of 2)
  doc.setFontSize(8)
  doc.text(`Page 1 of 2`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })

  // ──── PAGE 2: CONSUMER INFORMATION NOTICE (CIN) ────
  doc.addPage()
  yPos = 30

  // Header
  doc.setFont('Helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(245, 158, 11)
  doc.text('Consumer Information Notice', margin, yPos)
  yPos += 10

  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(102, 102, 102)
  doc.text('Required under NZ Consumer Law for all used vehicles', margin, yPos)
  yPos += 10

  // CIN Data
  const cinData: Array<[string, string]> = [
    ['Vehicle Origin', sale.vehicleInfo.isNZNew ? 'NZ New' : 'Used Import'],
    ['Country of Origin', sale.vehicleInfo.originCountry],
    ['Number of Previous Owners', String(sale.vehicleInfo.previousOwners)],
    ['Odometer Reading (km)', sale.carYear.toString()],
    ['VIN / Chassis Number', sale.vehicleInfo.vin],
    ['License Plate', sale.vehicleInfo.plate],
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Field', 'Details']],
    body: cinData,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: {
      fontStyle: 'bold',
      textColor: [245, 158, 11],
      fillColor: [15, 15, 15],
      lineColor: [245, 158, 11],
      lineWidth: 0.5,
    },
    bodyStyles: {
      textColor: [255, 255, 255],
      fillColor: [15, 15, 15],
      lineColor: [100, 100, 100],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.4 },
      1: { cellWidth: contentWidth * 0.6 },
    },
  })

  yPos = (doc as any).lastAutoTable.finalY + 15

  // Footer text
  doc.setFont('Helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(128, 128, 128)
  doc.text(
    'This notice is required to be displayed with all used vehicles for sale in New Zealand.',
    margin,
    yPos,
  )

  // Page footer
  footerY = doc.internal.pageSize.getHeight() - 25
  doc.setFontSize(9)
  doc.text('Thank you for your business - AutoMarket NZ', pageWidth / 2, footerY, { align: 'center' })
  doc.text('contact@automarket.co.nz | +64 9 123 4567 | 123 Queen Street Auckland', pageWidth / 2, footerY + 5, { align: 'center' })

  // Page number (Page 2 of 2)
  doc.setFontSize(8)
  doc.text(`Page 2 of 2`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })

  // Download
  const filename = `Invoice_${invNumber}_${sale.buyer.name.replace(/\s+/g, '_')}.pdf`
  doc.save(filename)
}
