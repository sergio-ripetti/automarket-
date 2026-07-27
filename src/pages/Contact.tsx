import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Camera, Share2 } from 'lucide-react'
import { submitPublicMessage } from '../lib/messagesService'
import { FormInput, FormSelect, FormTextarea, FormLabel, FormError } from '../components/shared'

interface ContactFormData {
  name: string
  email: string
  phone: string
  reason: string
  message: string
}

type ContactErrors = Partial<Record<keyof ContactFormData, string>>

const emptyForm: ContactFormData = { name: '', email: '', phone: '', reason: '', message: '' }

// Filtra solo números y caracteres de formato (+, espacio, -)
const formatPhoneInput = (value: string): string => {
  return value.replace(/[^\d+\s\-()]/g, '')
}

// Valida formato de email
const isValidEmail = (email: string): boolean => {
  return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
}

const infoItems = [
  { icon: MapPin, label: 'Address', value: '123 Queen Street, Auckland CBD, Auckland 1010' },
  { icon: Phone, label: 'Phone', value: '+64 9 123 4567' },
  { icon: Mail, label: 'Email', value: 'contact@automarket.co.nz' },
  { icon: Clock, label: 'Hours', value: 'Monday to Friday: 9:00am – 6:00pm' },
]


// Renders the public contact page with a message form and business info - validates form fields client-side and saves submissions to Firestore
export default function Contact() {
  const [form, setForm] = useState<ContactFormData>(emptyForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitHovered, setSubmitHovered] = useState(false)


  // Validates required contact form fields (name, email format, phone, reason, message length) and sets error messages for any invalid fields
  const validate = (): boolean => {
    const e: ContactErrors = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!isValidEmail(form.email)) e.email = 'Invalid email'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.reason) e.reason = 'Required'
    if (!form.message.trim()) e.message = 'Required'
    else if (form.message.trim().length < 10) e.message = 'Message too short'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Handles the contact form submission - validates input, then submits via backend API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const result = await submitPublicMessage({
        name: form.name,
        email: form.email,
        phone: form.phone,
        reason: form.reason,
        message: form.message,
        type: 'contact',
      })

      if (result.success) {
        setSubmitted(true)
      } else {
        alert(`Failed to send message: ${result.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message. Please try again.')
    }
  }

  return (
    <main
      style={{
        paddingTop: "7rem",
        paddingBottom: "4rem",
        backgroundColor: "#F2F2F0",
        minHeight: "100vh",
      }}>
      <div style={{ width: "80%", margin: "0 auto" }}>
        {/* ── Page Header ── */}
        <div style={{ marginBottom: "3rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
            }}>
            <div style={{ width: 40, height: 1, backgroundColor: "#E0E0DC" }} />
            <span
              className="font-bebas"
              style={{
                fontSize: "0.75rem",
                letterSpacing: "0.2em",
                color: "#767676",
              }}>
              GET IN TOUCH
            </span>
            <div style={{ width: 40, height: 1, backgroundColor: "#E0E0DC" }} />
          </div>
          <h1
            className="font-bebas"
            style={{
              color: "#1A1A1A",
              lineHeight: 1,
              marginBottom: "0.5rem",
              letterSpacing: "0.02em",
            }}>
            Contact Us
          </h1>
          <p
            style={{
              fontFamily: "Outfit",
              color: "#4A4A4A",
              fontSize: "1rem",
            }}>
            We'd love to hear from you
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "58% 42%",
            gap: "3rem",
            alignItems: "start",
          }}>
          {/* ════ LEFT — Contact Form ════ */}
          <div>
            <h2
              className="font-bebas"
              style={{
                color: "#1A1A1A",
                letterSpacing: "0.05em",
                marginBottom: "1.5rem",
                fontWeight: 600,
              }}>
              Send Us a Message
            </h2>

            {submitted ? (
              /* Success state */
              <div
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: "1rem",
                  padding: "3.5rem 2rem",
                  textAlign: "center",
                }}>
                <div
                  style={{
                    width: "4.5rem",
                    height: "4.5rem",
                    borderRadius: "50%",
                    backgroundColor: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.28)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}>
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  className="font-bebas"
                  style={{
                    color: "#0D1B2A",
                    letterSpacing: "0.05em",
                    marginBottom: "0.5rem",
                  }}>
                  Message Sent!
                </p>
                <p
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "0.875rem",
                    color: "#1A1A1A",
                    marginBottom: "2rem",
                    lineHeight: 1.6,
                  }}>
                  We'll be in touch within 24 hours.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setForm(emptyForm);
                  }}
                  style={{
                    fontFamily: "Outfit",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#FFFFFF",
                    border: "1px solid #C4FF00",
                    backgroundColor: "#1A1A1A",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1.75rem",
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#0D1B2A";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(196,255,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#1A1A1A";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}>
                  Send another message
                </button>
              </div>
            ) : (
              /* Form */
              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.125rem",
                }}>
                {/* Full Name */}
                <div>
                  <FormLabel required>Full Name</FormLabel>
                  <FormInput
                    value={form.name}
                    placeholder="John Smith"
                    maxLength={50}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    error={errors.name}
                  />
                  <FormError message={errors.name} />
                </div>

                {/* Email + Phone */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                  }}>
                  <div>
                    <FormLabel required>Email</FormLabel>
                    <FormInput
                      type="email"
                      value={form.email}
                      placeholder="john@example.com"
                      maxLength={50}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      error={errors.email}
                    />
                    <FormError message={errors.email} />
                  </div>
                  <div>
                    <FormLabel required>Phone</FormLabel>
                    <FormInput
                      type="tel"
                      value={form.phone}
                      placeholder="021 123 4567"
                      maxLength={20}
                      onChange={(e) =>
                        setForm({ ...form, phone: formatPhoneInput(e.target.value) })
                      }
                      error={errors.phone}
                    />
                    <FormError message={errors.phone} />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <FormLabel required>Reason for Contact</FormLabel>
                  <FormSelect
                    value={form.reason}
                    onChange={(e) =>
                      setForm({ ...form, reason: e.target.value })
                    }
                    error={errors.reason}>
                    <option value="">Select a reason</option>
                    <option value="purchase">Car purchase</option>
                    <option value="sale">Car sale</option>
                    <option value="financing">Financing enquiry</option>
                    <option value="other">Other</option>
                  </FormSelect>
                  <FormError message={errors.reason} />
                </div>

                {/* Message */}
                <div>
                  <FormLabel required>Message</FormLabel>
                  <FormTextarea
                    value={form.message}
                    placeholder="Tell us how we can help you..."
                    rows={5}
                    maxLength={500}
                    onChange={(e) =>
                      setForm({ ...form, message: e.target.value })
                    }
                    error={errors.message}
                  />
                  <FormError message={errors.message} />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  onMouseEnter={() => setSubmitHovered(true)}
                  onMouseLeave={() => setSubmitHovered(false)}
                  style={{
                    width: "100%",
                    height: "52px",
                    background: "#1A1A1A",
                    color: "#FFFFFF",
                    fontFamily: "Outfit",
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    letterSpacing: "0.04em",
                    border: "none",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    boxShadow: submitHovered
                      ? "0 0 25px rgba(26,26,26,0.35)"
                      : "none",
                    transition: "box-shadow 0.3s ease",
                  }}>
                  Send Message →
                </button>
              </form>
            )}
          </div>

          {/* ════ RIGHT — Info + Map ════ */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            {/* Premium Info Cards */}
            <div>
              <h2
                className="font-bebas"
                style={{
                  color: "#1A1A1A",
                  letterSpacing: "0.05em",
                  marginBottom: "1.75rem",
                  fontWeight: 600,
                }}>
                Our Details
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}>
                {infoItems.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E0E0DC",
                      borderRadius: "1rem",
                      padding: "1.5rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1.25rem",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#C4FF00";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 8px 24px rgba(196,255,0,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "#E0E0DC";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 2px 8px rgba(0,0,0,0.05)";
                    }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        flexShrink: 0,
                        backgroundColor: "#0D1B2A",
                        border: "1.5px solid #C4FF00",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}>
                      <Icon size={20} color="#C4FF00" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontFamily: "Poppins",
                          fontSize: "0.65rem",
                          color: "#0D1B2A",
                          letterSpacing: "0.12em",
                          marginBottom: "0.35rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}>
                        {label}
                      </p>
                      <p
                        style={{
                          fontFamily: "Poppins",
                          fontSize: "0.95rem",
                          color: "#1A1A1A",
                          fontWeight: 500,
                          lineHeight: 1.5,
                        }}>
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Social Media Icons */}
            <div>
              <p
                style={{
                  fontFamily: "Poppins",
                  fontSize: "0.65rem",
                  color: "#0D1B2A",
                  letterSpacing: "0.12em",
                  marginBottom: "1.25rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                Follow Us
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                }}>
                {/* Instagram */}
                <a
                  href="https://instagram.com/automarket.nz"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.75rem",
                    backgroundColor: "#0D1B2A",
                    border: "1.5px solid #E0E0DC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#C4FF00";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 24px rgba(196,255,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E0E0DC";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}>
                  <Camera size={18} color="#C4FF00" />
                </a>

                {/* Facebook */}
                <a
                  href="https://facebook.com/automarketnz"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.75rem",
                    backgroundColor: "#0D1B2A",
                    border: "1.5px solid #E0E0DC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#C4FF00";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 24px rgba(196,255,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E0E0DC";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}>
                  <Share2 size={18} color="#C4FF00" />
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/+64912345678"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.75rem",
                    backgroundColor: "#0D1B2A",
                    border: "1.5px solid #E0E0DC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#C4FF00";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 24px rgba(196,255,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E0E0DC";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#C4FF00"
                    strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </a>

                {/* Email */}
                <a
                  href="mailto:contact@automarket.co.nz"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "0.75rem",
                    backgroundColor: "#0D1B2A",
                    border: "1.5px solid #E0E0DC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#C4FF00";
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 24px rgba(196,255,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "#E0E0DC";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}>
                  <Mail size={18} color="#C4FF00" />
                </a>
              </div>
            </div>

            {/* Premium Location Card */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E0E0DC",
                borderRadius: "1rem",
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#C4FF00";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 8px 24px rgba(196,255,0,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#E0E0DC";
                (e.currentTarget as HTMLElement).style.boxShadow =
                  "0 2px 8px rgba(0,0,0,0.05)";
              }}>
              {/* Map area */}
              {/* <div
                style={{
                  height: "160px",
                  backgroundColor: "#0D1B2A",
                  background:
                    "linear-gradient(135deg, #0D1B2A 0%, #1A2332 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: 0.1,
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C4FF00' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
                  }}></div>
                <MapPin size={40} color="#C4FF00" style={{ zIndex: 1 }} />
              </div> */}

              {/* Info section */}
              {/* <div style={{ padding: '1.5rem' }}>
                <p className="font-bebas" style={{
                  color: '#1A1A1A',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                }}>
                  Find Us in Auckland
                </p>
                <p style={{
                  fontFamily: 'Poppins',
                  fontSize: '0.85rem',
                  color: '#0D1B2A',
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}>
                  123 Queen Street<br />
                  Auckland CBD<br />
                  Auckland 1010, NZ
                </p>
                <a href="https://maps.google.com/?q=123+Queen+Street+Auckland" target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: '1rem',
                    fontFamily: 'Poppins',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#C4FF00',
                    textDecoration: 'none',
                    letterSpacing: '0.05em',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = '0.8'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = '1'
                  }}
                >
                  OPEN IN MAPS →
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
