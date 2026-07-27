import { FileText, File as FileIcon } from 'lucide-react'
import { detectDocumentKind } from '../../lib/documentKind'
import { useFileAvailability } from '../../hooks/useFileAvailability'

// Normalized document item accepted by DocumentGrid - each real data source (Sales' UploadedDocument,
// Financing's FinancingDocument) must be mapped into this shape by its caller. `type` is deliberately
// NOT used for image/PDF detection here - for Financing it is a business category ("payslip",
// "passport_license"), not a file-kind hint, so only mimeType/filename/url extension are consulted.
export interface NormalizedDocument {
  url: string
  filename?: string
  mimeType?: string
  publicId?: string
  resourceType?: string
}

interface DocumentGridProps {
  title: string
  documents: NormalizedDocument[]
  emptyMessage: string
}

// Shared compact document/photo grid used by both Sale Detail's "Documents & Photos" card and the
// Admin Financing "Supporting Documents" section, so both present the same visual language instead
// of maintaining two separate card implementations.
export function DocumentGrid({ title, documents, emptyMessage }: DocumentGridProps) {
  const nonImageUrls = documents
    .filter((doc) => detectDocumentKind(doc) !== 'image')
    .map((doc) => doc.url)
  const availability = useFileAvailability(nonImageUrls)

  return (
    <div
      style={{
        backgroundColor: "transparent",
        borderRadius: "0.875rem",
        padding: "1.25rem",
        marginBottom: "1.5rem",
      }}>
      <h4
        style={{
          fontFamily: "Outfit",
          fontSize: "0.85rem",
          color: "#767676",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "1rem",
        }}>
        {title}{documents.length > 0 ? ` (${documents.length})` : ''}
      </h4>
      {documents.length === 0 ? (
        <p style={{ fontFamily: "Outfit", fontSize: "0.85rem", color: "#767676" }}>
          {emptyMessage}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: "1rem",
          }}>
          {documents.map((doc, i) => {
            const kind = detectDocumentKind(doc)
            const isUnavailable = kind !== 'image' && availability[doc.url] === false
            const filename = doc.filename || decodeURIComponent(doc.url.split("/").pop() || `Document ${i + 1}`)
            return (
              <div
                key={doc.url || i}
                style={{
                  backgroundColor: "transparent",
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                  border: isUnavailable ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(29,78,216,0.2)",
                  position: "relative",
                  minWidth: 0,
                }}>
                {isUnavailable ? (
                  <div
                    style={{
                      height: "100px",
                      backgroundColor: "rgba(239,68,68,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#EF4444",
                      fontSize: "1.5rem",
                      gap: "0.25rem",
                    }}>
                    <span aria-hidden="true">⚠️</span>
                    <span style={{ fontFamily: "Outfit", fontSize: "0.65rem" }}>File unavailable</span>
                  </div>
                ) : kind === 'pdf' ? (
                  <div
                    style={{
                      height: "100px",
                      backgroundColor: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1A1A1A",
                    }}>
                    <FileText size={36} aria-label={`${filename} (PDF document)`} />
                  </div>
                ) : kind === 'image' ? (
                  <img
                    src={doc.url}
                    alt={filename}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      cursor: "pointer",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      height: "100px",
                      backgroundColor: "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1A1A1A",
                    }}>
                    <FileIcon size={36} aria-label={`${filename} (document)`} />
                  </div>
                )}
                <p
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "0.65rem",
                    color: "#767676",
                    padding: "0.4rem 0.5rem 0",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={filename}>
                  {filename}
                </p>
                {isUnavailable ? (
                  <p style={{
                    fontFamily: "Outfit",
                    fontSize: "0.6rem",
                    color: "#767676",
                    textAlign: "center",
                    padding: "0.5rem",
                    borderTop: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    This file could not be retrieved
                  </p>
                ) : (
                  <div style={{ display: "flex" }}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${filename}`}
                      style={{
                        flex: 1,
                        display: "block",
                        padding: "0.5rem",
                        fontFamily: "Outfit",
                        fontSize: "0.65rem",
                        color: "#1A1A1A",
                        textDecoration: "none",
                        textAlign: "center",
                        borderTop: "1px solid rgba(29,78,216,0.2)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(29,78,216,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}>
                      View
                    </a>
                    <a
                      href={doc.url}
                      download={filename}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Download ${filename}`}
                      style={{
                        flex: 1,
                        display: "block",
                        padding: "0.5rem",
                        fontFamily: "Outfit",
                        fontSize: "0.65rem",
                        color: "#1A1A1A",
                        textDecoration: "none",
                        textAlign: "center",
                        borderTop: "1px solid rgba(29,78,216,0.2)",
                        borderLeft: "1px solid rgba(29,78,216,0.2)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(29,78,216,0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}>
                      Download
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
