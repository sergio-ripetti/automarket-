import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Camera, Share2 } from 'lucide-react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { sanitizeForFirestore } from '../lib/sanitize'

interface ContactFormData {
  name: string
  email: string
  phone: string
  reason: string
  message: string
}

type ContactErrors = Partial<Record<keyof ContactFormData, string>>

const emptyForm: ContactFormData = { name: '', email: '', phone: '', reason: '', message: '' }

const infoItems = [
  { icon: MapPin, label: 'Address', value: '123 Queen Street, Auckland CBD, Auckland 1010' },
  { icon: Phone, label: 'Phone', value: '+64 9 123 4567' },
  { icon: Mail, label: 'Email', value: 'contact@automarket.co.nz' },
  { icon: Clock, label: 'Hours', value: 'Monday to Friday: 9:00am – 6:00pm' },
]

const CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")"

const labelStyle: React.CSSProperties = {
  fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '6px',
}

const errorStyle: React.CSSProperties = {
  fontFamily: 'Outfit', fontSize: '0.7rem', color: 'rgba(239,68,68,0.85)', marginTop: '0.3rem',
}

// Renders the public contact page with a message form and business info - validates form fields client-side and saves submissions to Firestore
export default function Contact() {
  const [form, setForm] = useState<ContactFormData>(emptyForm)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
  const [submitHovered, setSubmitHovered] = useState(false)

  const inputStyle = (name: string, hasErr?: boolean): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box',
    backgroundColor: '#F4F7FA',
    border: `1px solid ${hasErr ? 'rgba(239,68,68,0.55)' : focused === name ? '#2C6E9E' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '0.625rem', padding: '0.75rem 1rem',
    fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: "#0D1B2A", outline: 'none',
    transition: 'border-color 0.2s',
  })

  const selectStyle = (name: string, hasErr?: boolean): React.CSSProperties => ({
    ...inputStyle(name, hasErr),
    appearance: 'none',
    backgroundImage: CHEVRON,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    paddingRight: '2.5rem',
    cursor: 'pointer',
  })

  // Validates required contact form fields (name, email format, phone, reason, message length) and sets error messages for any invalid fields
  const validate = (): boolean => {
    const e: ContactErrors = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.reason) e.reason = 'Required'
    if (!form.message.trim()) e.message = 'Required'
    else if (form.message.trim().length < 10) e.message = 'Message too short'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Handles the contact form submission - validates input, sanitizes it, then sends it to Firestore as a new "contact" type message document
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const messageData = {
        senderName: form.name,
        email: form.email,
        phone: form.phone,
        reason: form.reason,
        message: form.message,
        read: false,
        type: 'contact',
        createdAt: serverTimestamp(),
      }
      const safeMessageData = sanitizeForFirestore(messageData) as Record<string, unknown>
      await addDoc(collection(db, 'messages'), safeMessageData)
      setSubmitted(true)
    } catch (err) {
      console.error('Failed to send message:', err)
      alert('Failed to send message. Please try again.')
    }
  }

  return (
    <main style={{ paddingTop: '7rem', paddingBottom: '4rem', backgroundColor: '#F4F7FA', minHeight: '100vh' }}>
      <div style={{ width: '80%', margin: '0 auto' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 1, backgroundColor: '#2C6E9E' }} />
            <span className="font-bebas" style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: '#2C6E9E' }}>
              GET IN TOUCH
            </span>
            <div style={{ width: 40, height: 1, backgroundColor: '#2C6E9E' }} />
          </div>
          <h1 className="font-bebas" style={{color: "#0D1B2A", lineHeight: 1, marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
            Contact Us
          </h1>
          <p style={{ fontFamily: 'Outfit', color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>
            We'd love to hear from you
          </p>
        </div>

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '58% 42%', gap: '3rem', alignItems: 'start' }}>

          {/* ════ LEFT — Contact Form ════ */}
          <div>
            <h2 className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
              Send Us a Message
            </h2>

            {submitted ? (
              /* Success state */
              <div style={{
                backgroundColor: '#FFFFFF', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '1rem', padding: '3.5rem 2rem', textAlign: 'center',
              }}>
                <div style={{
                  width: '4.5rem', height: '4.5rem', borderRadius: '50%',
                  backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Message Sent!
                </p>
                <p style={{ fontFamily: 'Outfit', fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', marginBottom: '2rem', lineHeight: 1.6 }}>
                  We'll be in touch within 24 hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm(emptyForm) }}
                  style={{
                    fontFamily: 'Outfit', fontSize: '0.8rem', fontWeight: 600,
                    color: '#2C6E9E', border: '1px solid rgba(29,78,216,0.35)',
                    backgroundColor: 'transparent', borderRadius: '0.5rem',
                    padding: '0.625rem 1.5rem', cursor: 'pointer', letterSpacing: '0.04em',
                  }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

                {/* Full Name */}
                <div>
                  <label style={labelStyle}>FULL NAME *</label>
                  <input value={form.name} placeholder="John Smith"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                    style={inputStyle('name', !!errors.name)} />
                  {errors.name && <p style={errorStyle}>{errors.name}</p>}
                </div>

                {/* Email + Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>EMAIL *</label>
                    <input type="email" value={form.email} placeholder="john@example.com"
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
                      style={inputStyle('email', !!errors.email)} />
                    {errors.email && <p style={errorStyle}>{errors.email}</p>}
                  </div>
                  <div>
                    <label style={labelStyle}>PHONE *</label>
                    <input type="tel" value={form.phone} placeholder="+64 21 123 4567"
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)}
                      style={inputStyle('phone', !!errors.phone)} />
                    {errors.phone && <p style={errorStyle}>{errors.phone}</p>}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label style={labelStyle}>REASON FOR CONTACT *</label>
                  <select
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    onFocus={() => setFocused('reason')} onBlur={() => setFocused(null)}
                    style={selectStyle('reason', !!errors.reason)}
                  >
                    <option value="" style={{ backgroundColor: '#111' }}>Select a reason</option>
                    <option value="purchase" style={{ backgroundColor: '#111' }}>Car purchase</option>
                    <option value="sale" style={{ backgroundColor: '#111' }}>Car sale</option>
                    <option value="financing" style={{ backgroundColor: '#111' }}>Financing enquiry</option>
                    <option value="other" style={{ backgroundColor: '#111' }}>Other</option>
                  </select>
                  {errors.reason && <p style={errorStyle}>{errors.reason}</p>}
                </div>

                {/* Message */}
                <div>
                  <label style={labelStyle}>MESSAGE *</label>
                  <textarea
                    value={form.message} placeholder="Tell us how we can help you..."
                    rows={5}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    onFocus={() => setFocused('message')} onBlur={() => setFocused(null)}
                    style={{ ...inputStyle('message', !!errors.message), resize: 'none', lineHeight: 1.55 } as React.CSSProperties}
                  />
                  {errors.message && <p style={errorStyle}>{errors.message}</p>}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  onMouseEnter={() => setSubmitHovered(true)}
                  onMouseLeave={() => setSubmitHovered(false)}
                  style={{
                    width: '100%', height: '52px',
                    background: 'linear-gradient(135deg, #2C6E9E 0%, #1F5680 100%)',
                    color: '#000', fontFamily: 'Outfit', fontWeight: 700,
                    fontSize: '0.95rem', letterSpacing: '0.04em',
                    border: 'none', borderRadius: '0.75rem', cursor: 'pointer',
                    boxShadow: submitHovered ? '0 0 25px rgba(29,78,216,0.35)' : 'none',
                    transition: 'box-shadow 0.3s ease',
                  }}
                >
                  Send Message →
                </button>
              </form>
            )}
          </div>

          {/* ════ RIGHT — Info + Map ════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Info cards */}
            <div>
              <h2 className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.05em', marginBottom: '1.5rem' }}>
                Our Details
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {infoItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{
                    backgroundColor: '#E4EAF0', borderRadius: '0.75rem',
                    padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: 'rgba(29,78,216,0.1)', border: '1px solid rgba(29,78,216,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color="#2C6E9E" />
                    </div>
                    <div>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
                        {label.toUpperCase()}
                      </p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow Us */}
            <div>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.65rem', color: 'rgba(255,255,255,0.32)', letterSpacing: '0.14em', marginBottom: '0.875rem' }}>
                FOLLOW US
              </p>
              <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                {/* Instagram */}
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
                  color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.75rem', fontWeight: 600,
                  padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer',
                }}>
                  <Camera size={13} />
                  @automarket.nz
                </button>
                {/* Facebook */}
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'linear-gradient(135deg, #1877F2, #0a58ca)',
                  color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.75rem', fontWeight: 600,
                  padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer',
                }}>
                  <Share2 size={13} />
                  AutoMarket NZ
                </button>
                {/* WhatsApp */}
                <button style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  background: 'linear-gradient(135deg, #25D366, #128C7E)',
                  color: "#0D1B2A", fontFamily: 'Outfit', fontSize: '0.75rem', fontWeight: 600,
                  padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', cursor: 'pointer',
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 17.155c-.227.634-.836 1.16-1.484 1.381-.595.205-1.328.259-1.997.143-.854-.148-1.671-.547-2.416-.975-1.67-.962-3.093-2.356-4.081-4.024-.43-.73-.73-1.533-.729-2.386 0-1.116.421-2.101 1.171-2.842.248-.243.526-.31.772-.256.198.044.376.188.534.512.243.499.821 1.958.88 2.099.06.141.1.306.023.484-.076.177-.113.272-.218.416-.106.145-.222.299-.329.443-.106.144-.218.3-.132.531.086.231.383.761.823 1.234.573.617 1.058 1.018 1.636 1.335.577.317.855.267 1.17-.072.246-.266.535-.725.775-1.107.147-.236.327-.281.544-.189.217.092 1.371.647 1.609.766.238.12.397.18.456.28.06.1.06.58-.167 1.227z" />
                  </svg>
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Map placeholder */}
            <div style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #E4EAF0 100%)',
              border: '1px solid rgba(29,78,216,0.15)',
              borderRadius: '1rem', height: '200px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}>
              <MapPin size={32} color="#2C6E9E" />
              <p className="font-bebas" style={{color: "#0D1B2A", letterSpacing: '0.1em' }}>
                Find Us in Auckland
              </p>
              <p style={{ fontFamily: 'Outfit', fontSize: '0.75rem', color: 'rgba(255,255,255,0.32)' }}>
                Auckland CBD, New Zealand
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
