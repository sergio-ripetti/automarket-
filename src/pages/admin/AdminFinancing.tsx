import { useEffect, useState } from 'react'
import { Trash2, Eye, X } from 'lucide-react'
import { getFinancingRequests, updateFinancingStatus, deleteFinancingRequest } from '../../lib/financingService'
import AdminToast from '../../components/admin/AdminToast'
import { useToast } from '../../hooks/useToast'
import type { FinancingRequest } from '../../lib/financingService'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'paying' | 'completed'

function fmt(p: number) {
  return p.toLocaleString('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 })
}

function fmtDate(ts: { toDate: () => Date } | undefined) {
  if (!ts || typeof ts.toDate !== 'function') return '—'
  return ts.toDate().toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusColor: Record<FinancingRequest['status'], string> = {
  pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
  paying: '#3b82f6', completed: '#6b7280',
}

const statusLabel: Record<FinancingRequest['status'], string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
  paying: 'Paying', completed: 'Completed',
}

const tabs: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'pending', label: 'Pending' }, { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' }, { id: 'paying', label: 'Paying' }, { id: 'completed', label: 'Completed' },
]

export default function AdminFinancing() {
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusFilter>('all')
  const [selectedRequest, setSelectedRequest] = useState<FinancingRequest | null>(null)
  const { toast, showToast, dismissToast } = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFinancingRequests()
        setRequests(data)
      } catch (err) {
        console.error(err)
        showToast('Failed to load financing requests.', 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showToast])

  const filtered = activeTab === 'all'
    ? requests
    : requests.filter((r) => r.status === activeTab)

  const handleStatusChange = async (id: string, newStatus: FinancingRequest['status']) => {
    try {
      await updateFinancingStatus(id, newStatus)
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
      showToast(`Status updated to ${statusLabel[newStatus]}.`, 'success')
    } catch {
      showToast('Failed to update status.', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this financing request? This cannot be undone.')) return
    try {
      await deleteFinancingRequest(id)
      setRequests((prev) => prev.filter((r) => r.id !== id))
      showToast('Request deleted.', 'success')
    } catch {
      showToast('Failed to delete request.', 'error')
    }
  }

  const handleReply = (email: string, carTitle: string) => {
    const subject = `Re: Financing Request - ${carTitle}`
    const body = encodeURIComponent('Thank you for your financing application. We will review your request and get back to you shortly.')
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`
  }

  return (
    <div>
      <h1
        className="font-bebas"
        style={{
          fontSize: "2rem",
          color: "white",
          lineHeight: 1,
          marginBottom: "1.5rem",
        }}>
        Financing Requests
      </h1>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "2rem",
              fontFamily: "Outfit",
              fontSize: "0.85rem",
              cursor: "pointer",
              border: "none",
              transition: "all 0.2s",
              ...(activeTab === id
                ? { backgroundColor: "#f59e0b", color: "#000", fontWeight: 700 }
                : {
                    backgroundColor: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.5)",
                  }),
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Requests */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                backgroundColor: "#111111",
                height: 200,
                borderRadius: "1rem",
              }}
            />
          ))
        ) : filtered.length === 0 ? (
          <p
            style={{
              fontFamily: "Outfit",
              color: "rgba(255,255,255,0.3)",
              fontSize: "0.9rem",
              padding: "2rem",
              textAlign: "center",
            }}>
            No financing requests{" "}
            {activeTab !== "all" &&
              `with status "${statusLabel[activeTab as FinancingRequest["status"]]}"`}
          </p>
        ) : (
          filtered.map((req) => (
            <div
              key={req.id}
              style={{
                backgroundColor: "#111111",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}>
                <div>
                  <p
                    className="font-bebas"
                    style={{
                      fontSize: "1.25rem",
                      color: "white",
                      letterSpacing: "0.03em",
                      lineHeight: 1,
                      marginBottom: "0.25rem",
                    }}>
                    {req.firstName} {req.lastName}
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.5)",
                    }}>
                    {req.email} · {req.phone}
                  </p>
                </div>
                <div
                  style={{
                    backgroundColor: statusColor[req.status],
                    color: "#000",
                    padding: "0.4rem 0.75rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}>
                  {statusLabel[req.status]}
                </div>
              </div>

              {/* Details */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Vehicle
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {req.carTitle}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Loan Amount
                  </p>
                  <p
                    className="font-bebas"
                    style={{
                      fontSize: "1.25rem",
                      color: "#f59e0b",
                      lineHeight: 1,
                    }}>
                    {fmt(req.totalAmount)}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Monthly Payment
                  </p>
                  <p
                    className="font-bebas"
                    style={{ fontSize: "1rem", color: "#f59e0b" }}>
                    {fmt(req.monthlyPayment)}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Loan Term
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {req.loanTerm} months
                  </p>
                </div>
              </div>

              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.35)",
                  marginBottom: "1rem",
                }}>
                Submitted{" "}
                {fmtDate(req.createdAt as unknown as { toDate: () => Date })}
              </p>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleStatusChange(req.id, "approved")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid #10b981",
                    color: "#10b981",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Approve
                </button>
                <button
                  onClick={() => handleStatusChange(req.id, "rejected")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Reject
                </button>
                <button
                  onClick={() => handleStatusChange(req.id, "paying")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid #3b82f6",
                    color: "#3b82f6",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Mark Paying
                </button>
                <button
                  onClick={() => handleStatusChange(req.id, "completed")}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid #6b7280",
                    color: "#6b7280",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Complete
                </button>

                <button
                  onClick={() => handleReply(req.email, req.carTitle)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid #f59e0b",
                    color: "#f59e0b",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Reply
                </button>
                <button
                  onClick={() => setSelectedRequest(req)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid #fd6b33",
                    color: "#fd6b33",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  <Eye size={14} /> View Details
                </button>
                <button
                  onClick={() => handleDelete(req.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    border: "1px solid rgba(220,38,38,0.4)",
                    color: "#ef4444",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}>
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Details Modal */}
      {selectedRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "1rem",
          }}>
          <div
            style={{
              backgroundColor: "#111111",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: "1.25rem",
              width: "90%",
              maxWidth: "700px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2rem",
            }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "2rem",
              }}>
              <div>
                <h2
                  className="font-bebas"
                  style={{
                    fontSize: "2rem",
                    color: "white",
                    lineHeight: 1,
                    marginBottom: "0.5rem",
                  }}>
                  Financing Application
                </h2>
                <p
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "1rem",
                    color: "#f59e0b",
                  }}>
                  {selectedRequest.firstName} {selectedRequest.lastName}
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                style={{
                  backgroundColor: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  fontSize: "1.5rem",
                  padding: 0,
                }}>
                <X size={24} />
              </button>
            </div>

            {/* SECTION 1: Personal Information */}
            <div style={{ marginBottom: "2rem" }}>
              <h3
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}>
                Personal Information
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                }}>
                {[
                  {
                    label: "Full Name",
                    value: `${selectedRequest.firstName} ${selectedRequest.lastName}`,
                  },
                  { label: "Email", value: selectedRequest.email },
                  { label: "Phone", value: selectedRequest.phone },
                  {
                    label: "License Number",
                    value: selectedRequest.licenseNumber,
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.7rem",
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "0.25rem",
                      }}>
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.875rem",
                        color: "white",
                      }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: Vehicle & Loan Details */}
            <div
              style={{
                marginBottom: "2rem",
                paddingBottom: "2rem",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
              <h3
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}>
                Vehicle & Loan Details
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                  marginBottom: "1.5rem",
                }}>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Vehicle
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {selectedRequest.carTitle}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.7rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}>
                    Vehicle Price
                  </p>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "white",
                    }}>
                    {fmt(selectedRequest.totalAmount)}
                  </p>
                </div>
              </div>
              <p
                className="font-bebas"
                style={{
                  fontSize: "1.5rem",
                  color: "#f59e0b",
                  marginBottom: "1.5rem",
                }}>
                {fmt(selectedRequest.totalAmount)}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.5rem",
                }}>
                {[
                  {
                    label: "Down Payment",
                    value: fmt(selectedRequest.downPayment),
                  },
                  {
                    label: "Loan Term",
                    value: `${selectedRequest.loanTerm} months`,
                  },
                  {
                    label: "Monthly Payment",
                    value: fmt(selectedRequest.monthlyPayment),
                  },
                  {
                    label: "Total Interest",
                    value: fmt(selectedRequest.totalInterest),
                  },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.7rem",
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginBottom: "0.25rem",
                      }}>
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: "Outfit",
                        fontSize: "0.875rem",
                        color: "white",
                      }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: Employment Details */}
            {selectedRequest.employer && (
              <div
                style={{
                  marginBottom: "2rem",
                  paddingBottom: "2rem",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                <h3
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "0.9rem",
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "1rem",
                  }}>
                  Employment Details
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "1.5rem",
                  }}>
                  {[
                    { label: "Employer", value: selectedRequest.employer },
                    { label: "Job Title", value: selectedRequest.jobTitle },
                    {
                      label: "Employment Type",
                      value:
                        selectedRequest.employmentType
                          ?.replace(/([A-Z])/g, " $1")
                          .trim() || "—",
                    },
                    {
                      label: "Years Employed",
                      value: `${selectedRequest.yearsEmployed} years`,
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.7rem",
                          color: "rgba(255,255,255,0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "0.25rem",
                        }}>
                        {label}
                      </p>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.875rem",
                          color: "white",
                        }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "1.5rem",
                  }}>
                  {[
                    {
                      label: "Monthly Income",
                      value: fmt(selectedRequest.monthlyIncome || 0),
                    },
                    {
                      label: "Monthly Expenses",
                      value: fmt(selectedRequest.monthlyExpenses || 0),
                    },
                    {
                      label: "Net Monthly",
                      value: fmt(
                        (selectedRequest.monthlyIncome || 0) -
                          (selectedRequest.monthlyExpenses || 0),
                      ),
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.7rem",
                          color: "rgba(255,255,255,0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          marginBottom: "0.25rem",
                        }}>
                        {label}
                      </p>
                      <p
                        style={{
                          fontFamily: "Outfit",
                          fontSize: "0.875rem",
                          color: "white",
                        }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: Documents */}
            {selectedRequest.documents &&
              selectedRequest.documents.length > 0 && (
                <div
                  style={{
                    marginBottom: "2rem",
                    paddingBottom: "2rem",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}>
                  <h3
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "1rem",
                    }}>
                    Documents ({selectedRequest.documents.length})
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: "1rem",
                    }}>
                    {selectedRequest.documents.map((doc) => (
                      <div
                        key={doc.url}
                        style={{
                          backgroundColor: "#0f0f0f",
                          borderRadius: "0.75rem",
                          padding: "1rem",
                          textAlign: "center",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                        <p
                          style={{
                            fontFamily: "Outfit",
                            fontSize: "0.65rem",
                            color: "rgba(255,255,255,0.4)",
                            marginBottom: "0.75rem",
                            textTransform: "capitalize",
                          }}>
                          {doc.type.replace(/_/g, " ")}
                        </p>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "0.5rem 1rem",
                            backgroundColor: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.3)",
                            color: "#f59e0b",
                            borderRadius: "0.5rem",
                            fontFamily: "Outfit",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}>
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {!selectedRequest.documents ||
              (selectedRequest.documents.length === 0 && (
                <div
                  style={{
                    marginBottom: "2rem",
                    paddingBottom: "2rem",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}>
                  <h3
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: "1rem",
                    }}>
                    Documents
                  </h3>
                  <p
                    style={{
                      fontFamily: "Outfit",
                      fontSize: "0.875rem",
                      color: "rgba(255,255,255,0.3)",
                    }}>
                    No documents uploaded
                  </p>
                </div>
              ))}

            {/* SECTION 5: Application Status */}
            <div>
              <h3
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}>
                Application Status
              </h3>
              <div style={{ marginBottom: "1.5rem" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    backgroundColor: statusColor[selectedRequest.status],
                    color: "#000",
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}>
                  {statusLabel[selectedRequest.status]}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "Outfit",
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: "1.5rem",
                }}>
                Submitted{" "}
                {fmtDate(
                  selectedRequest.createdAt as unknown as {
                    toDate: () => Date;
                  },
                )}
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "approved");
                    setSelectedRequest(null);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.85rem",
                    border: "1px solid #10b981",
                    color: "#10b981",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "rejected");
                    setSelectedRequest(null);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.85rem",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "paying");
                    setSelectedRequest(null);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.85rem",
                    border: "1px solid #3b82f6",
                    color: "#3b82f6",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Mark Paying
                </button>
                <button
                  onClick={() => {
                    handleStatusChange(selectedRequest.id, "completed");
                    setSelectedRequest(null);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.5rem",
                    fontFamily: "Outfit",
                    fontSize: "0.85rem",
                    border: "1px solid #6b7280",
                    color: "#6b7280",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}>
                  Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
