import type { Sale } from '../../../../lib/salesService'
import { normalizeDocument } from '../../../../lib/salesService'
import { DocumentGrid } from '../../../shared/DocumentGrid'

interface SaleDocumentsCardProps {
  sale: Sale
}

export function SaleDocumentsCard({ sale }: SaleDocumentsCardProps) {
  const documents = (sale.documents?.uploadedDocuments ?? []).map(normalizeDocument)

  return (
    <DocumentGrid
      title="Documents & Photos"
      documents={documents}
      emptyMessage="No documents uploaded"
    />
  )
}
