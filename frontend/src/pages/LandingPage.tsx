import React, { useState } from 'react'
import { Link } from 'react-router-dom'

// ── smooth-scroll helper ────────────────────────────────────────
function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Contact modal ───────────────────────────────────────────────
const ContactModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [form, setForm] = useState({ name: '', email: '', role: 'donor', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app this would POST to backend; here we just show success
    setSent(true)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={onClose} />

      {/* Card */}
      <div style={{ position: 'relative', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-2xl)', width: '100%', maxWidth: 480, padding: '2rem', boxShadow: '0 32px 80px rgba(0,0,0,0.2)', borderTop: '4px solid var(--primary)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)', display: 'flex' }}>
          <span className="material-symbols-outlined">close</span>
        </button>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 56, color: 'var(--primary)', display: 'block', marginBottom: '1rem' }}>check_circle</span>
            <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-headline)' }}>Message Sent!</h3>
            <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>Thank you for reaching out. Our team will respond within 24 hours.</p>
            <button onClick={onClose} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-headline)', fontSize: '1.375rem', marginBottom: '0.25rem' }}>Contact Us</h3>
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>Reach out to the AnnaDaan team — we respond within 24 hours.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input className="form-input" required placeholder="e.g. Priya Mehta" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" required placeholder="you@example.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">I am a…</label>
                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="donor">Food Donor / Restaurant</option>
                  <option value="ngo">NGO / Charity</option>
                  <option value="media">Media / Press</option>
                  <option value="partner">Partnership Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-textarea" required placeholder="How can we help you?" value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ minHeight: 100 }} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                Send Message
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const [mealCount] = useState(284310)
  const [donors]    = useState(1240)
  const [ngos]      = useState(380)
  const [contactOpen, setContactOpen] = useState(false)

  const navLinks = [
    { label: 'Our Mission',     action: () => scrollTo('mission') },
    { label: 'FSSAI Guidelines',action: () => scrollTo('fssai') },
    { label: 'Impact',          action: () => scrollTo('impact') },
    { label: 'Contact',         action: () => setContactOpen(true) },
  ]

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', fontFamily: 'var(--font-body)' }}>

      {/* Contact Modal */}
      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}

      {/* ── Nav ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(252,249,243,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: 28 }}>eco</span>
            <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary-container)' }}>AnnaDaan</span>
          </div>
          <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {navLinks.map(item => (
              <button key={item.label} onClick={item.action}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--on-surface-variant)', fontWeight: 500, fontSize: '0.9375rem', fontFamily: 'var(--font-body)', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--on-surface-variant)')}>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/auth" className="btn btn-ghost" style={{ fontWeight: 600, color: 'var(--primary)' }}>Join as Donor</Link>
            <Link to="/auth" className="btn btn-primary">Join as NGO</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '5rem 2rem 8rem', overflow: 'hidden', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', fontFamily: 'var(--font-headline)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', color: 'var(--on-surface)' }}>
              Turn <em style={{ color: 'var(--primary)', fontStyle: 'italic' }}>surplus</em> into sustenance
            </h1>
            <p style={{ fontSize: '1.1875rem', color: 'var(--on-surface-variant)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 480 }}>
              AnnaDaan connects food donors with NGOs across India — powered by AI, governed by FSSAI. Together, we ensure no meal goes to waste.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/auth" className="btn btn-primary btn-lg">
                <span className="material-symbols-outlined">volunteer_activism</span>
                Donate Food
              </Link>
              <Link to="/auth" className="btn btn-outline btn-lg" style={{ fontSize: '1rem' }}>Receive Food</Link>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, background: 'color-mix(in srgb, var(--primary) 6%, transparent)', borderRadius: '50%', filter: 'blur(60px)' }} />
            <div style={{ background: 'var(--surface-container-lowest)', borderRadius: 40, padding: '1rem', boxShadow: '0 32px 80px rgba(0,0,0,0.08)', position: 'relative' }}>
              <img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=600&fit=crop&q=80" alt="Food donation" style={{ borderRadius: 30, width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: -24, left: -24, background: 'white', padding: '1.25rem 1.5rem', borderRadius: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: 260, border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div style={{ padding: '0.375rem', background: 'var(--tertiary-fixed)', borderRadius: 8 }}>
                    <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: 18 }}>verified</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary-container)' }}>FSSAI VERIFIED</span>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--on-surface)' }}>
                  AI is matching your surplus from <strong style={{ color: 'var(--primary)' }}>Zaitoon Resto</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Impact Counter ── */}
      <section id="impact" style={{ background: 'var(--primary-container)', padding: '3rem 2rem', position: 'relative', overflow: 'hidden', scrollMarginTop: '80px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
            <path d="M0 100 C 20 0 50 0 100 100" fill="none" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { emoji: '🍱', value: mealCount.toLocaleString('en-IN'), label: 'Meals Saved' },
            { emoji: '🏪', value: donors.toLocaleString('en-IN'),    label: 'Active Donors' },
            { emoji: '🤝', value: ngos.toLocaleString('en-IN'),      label: 'NGO Partners' },
          ].map(({ emoji, value, label }) => (
            <div key={label} style={{ textAlign: 'center', color: 'var(--on-primary)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>{value}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.8 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Our Mission ── */}
      <section id="mission" style={{ padding: '6rem 2rem', background: 'var(--surface-container-low)', scrollMarginTop: '80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: '4rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8125rem', display: 'block', marginBottom: '0.75rem' }}>Our Mission</span>
            <h2>Seamless connection from surplus to sustenance</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {[
              { n: '01', icon: 'upload_file',   title: 'Donor submits details',    desc: 'Log surplus quantity and expiry times via our easy mobile app or portal in under 2 minutes.' },
              { n: '02', icon: 'psychology',    title: 'AI matches efficiently',    desc: 'Gemini AI identifies the nearest active NGO with relevant storage capacity and route optimization.' },
              { n: '03', icon: 'local_shipping',title: 'Food reaches the needy',   desc: 'Verified logistics partners ensure safe handling according to strict FSSAI hygiene guidelines.' },
            ].map(step => (
              <div key={step.n} style={{ padding: '2rem', background: 'var(--surface-container-lowest)', borderRadius: 32, position: 'relative', transition: 'all 0.4s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as any).style.boxShadow = '0 24px 60px rgba(64,73,61,0.1)'; (e.currentTarget as any).style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { (e.currentTarget as any).style.boxShadow = ''; (e.currentTarget as any).style.transform = '' }}>
                <span style={{ position: 'absolute', top: -24, left: -8, fontFamily: 'var(--font-headline)', fontSize: '5rem', fontWeight: 800, color: 'color-mix(in srgb, var(--primary) 6%, transparent)', lineHeight: 1, userSelect: 'none' }}>{step.n}</span>
                <div style={{ width: 64, height: 64, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: 28 }}>{step.icon}</span>
                </div>
                <h3 style={{ fontSize: '1.375rem', marginBottom: '0.875rem' }}>{step.title}</h3>
                <p style={{ color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FSSAI Guidelines ── */}
      <section id="fssai" style={{ padding: '6rem 2rem', background: 'var(--background)', scrollMarginTop: '80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: '3rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#1565C0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.8125rem', display: 'block', marginBottom: '0.75rem' }}>Regulatory Compliance</span>
            <h2>FSSAI Food Safety Guidelines</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '1.0625rem', marginTop: '0.75rem', maxWidth: 640, lineHeight: 1.7 }}>
              Every donation on AnnaDaan follows India's Food Safety and Standards Authority norms to ensure hygienic, safe redistribution.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            {[
              { icon: 'thermostat',       color: '#1565C0', title: 'Cold Chain Compliance',    desc: 'Perishable food must be maintained between 0–5°C during transit. All transport partners are cold-chain certified.' },
              { icon: 'timer',            color: '#0d631b', title: 'Expiry & Shelf Life',      desc: 'Donations must have a minimum 3-hour shelf life remaining. Our AI flags items near expiry for priority matching.' },
              { icon: 'health_and_safety',color: '#9e4200', title: 'Hygiene Standards',        desc: 'All donors undergo FSSAI registration verification. Food packaging and handling logs are stored for audit.' },
              { icon: 'description',      color: '#2E7D32', title: 'Traceability & Audit',     desc: 'End-to-end chain-of-custody records are maintained digitally, accessible to FSSAI inspectors on demand.' },
              { icon: 'science',          color: '#7B1FA2', title: 'Allergen Disclosure',      desc: 'Donors must declare common allergens (gluten, dairy, nuts). NGOs can filter donations by allergen profile.' },
              { icon: 'verified_user',    color: '#E65100', title: 'NGO Vetting Process',      desc: 'Recipient NGOs are verified via FSSAI licence number and physical inspection before onboarding.' },
            ].map(g => (
              <div key={g.title} style={{ display: 'flex', gap: '1rem', padding: '1.5rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-xl)', border: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as any).style.boxShadow = '0 8px 32px rgba(0,0,0,0.07)'; (e.currentTarget as any).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as any).style.boxShadow = ''; (e.currentTarget as any).style.transform = '' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `color-mix(in srgb, ${g.color} 12%, transparent)`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ color: g.color, fontSize: 24 }}>{g.icon}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-headline)', marginBottom: '0.375rem', color: g.color }}>{g.title}</div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.65, margin: 0 }}>{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '2rem', padding: '1.25rem 1.5rem', background: 'color-mix(in srgb, #1565C0 6%, transparent)', borderRadius: 'var(--radius-xl)', border: '1px solid color-mix(in srgb, #1565C0 20%, transparent)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 32, color: '#1565C0', flexShrink: 0 }}>info</span>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>
              Full FSSAI compliance documentation is available at <strong style={{ color: '#1565C0' }}>fssai.gov.in</strong>. AnnaDaan operates under license registration <strong style={{ color: '#1565C0' }}>#FSSAI-2025-IND-0034</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: '6rem 2rem', background: 'var(--surface-container-low)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { quote: '"AnnaDaan has streamlined our operations. We no longer spend hours hunting for donors; the AI does it for us."', name: 'Rajesh Kumar',   role: 'Director, Sahyog NGO',           img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop' },
              { quote: '"Seeing our daily surplus feed children instead of hitting the bin gives our team a real purpose."',           name: 'Ananya Sharma',  role: 'Owner, The Spice Root',          img: 'https://images.unsplash.com/photo-1494790108755-2616b612b13e?w=80&fit=crop', offset: true },
              { quote: '"The integration of FSSAI standards within the digital tracking makes this the most credible food rescue platform."', name: 'Dr. Vikram Singh', role: 'FSSAI Compliance Officer', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop' },
            ].map(t => (
              <div key={t.name} style={{ background: 'var(--surface-container-lowest)', padding: '2.5rem', borderRadius: 40, border: '1px solid color-mix(in srgb, var(--outline-variant) 25%, transparent)', position: 'relative', marginTop: (t as any).offset ? '3rem' : 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3.5rem', color: 'var(--secondary)', opacity: 0.15, position: 'absolute', top: -12, left: -8 }}>format_quote</span>
                <p style={{ fontSize: '1.0625rem', color: 'var(--on-surface-variant)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: '2rem' }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <img src={t.img} alt={t.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#1b4332', color: 'white', padding: '4rem 2rem 2rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary-fixed)', fontSize: 32 }}>eco</span>
                <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.5rem' }}>AnnaDaan</span>
              </div>
              <p style={{ opacity: 0.6, lineHeight: 1.7, maxWidth: 320, marginBottom: '1.5rem' }}>
                Pioneering an AI-governed ecosystem for food surplus distribution, ensuring zero hunger across Indian metros.
              </p>
            </div>
            <div>
              <h4 style={{ fontFamily: 'var(--font-headline)', marginBottom: '1.25rem' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Our Mission',    action: () => scrollTo('mission') },
                  { label: 'FSSAI Compliance', action: () => scrollTo('fssai') },
                  { label: 'Impact',         action: () => scrollTo('impact') },
                  { label: 'Contact Us',     action: () => setContactOpen(true) },
                ].map(link => (
                  <li key={link.label}>
                    <button onClick={link.action}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontSize: '0.9375rem', textAlign: 'left', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.1)', alignSelf: 'flex-start' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>OFFICIAL PARTNER</div>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', fontFamily: 'var(--font-headline)', marginBottom: '0.375rem' }}>FSSAI</div>
              <p style={{ fontSize: '0.8125rem', opacity: 0.7, lineHeight: 1.5 }}>Certified for hygienic food redistribution standards.</p>
            </div>
          </div>
          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', opacity: 0.5, fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
            <span>© 2025 AnnaDaan Foundation. All Rights Reserved.</span>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <button onClick={() => scrollTo('mission')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>Privacy Policy</button>
              <button onClick={() => scrollTo('fssai')}  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>FSSAI Terms</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
