import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

type Role = 'donor' | 'ngo' | 'admin'

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [role, setRole] = useState<Role>('donor')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', organization_name: '', organization_type: 'restaurant', fssai_license: '', registration_number: '', address: '' })
  const { login, register, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(form.email, form.password, role)
      } else {
        await register({ ...form, role })
      }
      // Redirect based on role
      const user = JSON.parse(localStorage.getItem('annadaan_user') || '{}')
      if (user.role === 'admin') navigate('/admin')
      else if (user.role === 'ngo') navigate('/ngo')
      else navigate('/donor')
    } catch {}
  }

  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = [
    { image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&fit=crop&q=80', title: 'Nourishing Communities', text: 'Connecting surplus food to verified NGOs across India.' },
    { image: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&fit=crop&q=80', title: 'Zero Food Waste', text: 'AI-powered logistics ensuring swift food redistribution.' },
    { image: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1200&fit=crop&q=80', title: 'Community Impact', text: 'Bringing smiles and health to those who need it most.' },
  ]

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [slides.length])

  const roleConfig = {
    donor: { label: 'Donor', icon: 'restaurant', color: 'var(--primary)' },
    ngo: { label: 'NGO', icon: 'groups', color: 'var(--secondary)' },
    admin: { label: 'FSSAI', icon: 'security', color: 'var(--admin-accent)' }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', width: '100%' }}>
      {/* Left Column: Carousel (Hidden on mobile) */}
      <div className="auth-carousel" style={{ flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: 'var(--primary-container)' }}>
        {slides.map((s, i) => (
          <div key={i} style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            opacity: currentSlide === i ? 1 : 0, transition: 'opacity 1s ease',
            backgroundImage: `url(${s.image})`, backgroundSize: 'cover', backgroundPosition: 'center',
          }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6rem 3rem 4rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-headline)' }}>{s.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.2rem', maxWidth: '600px' }}>{s.text}</p>
            </div>
          </div>
        ))}
        {/* Carousel controls */}
        <div style={{ position: 'absolute', bottom: '2rem', left: '3rem', display: 'flex', gap: '8px', zIndex: 10 }}>
            {slides.map((_, i) => (
               <button key={i} type="button" onClick={() => setCurrentSlide(i)} style={{ width: currentSlide === i ? 24 : 8, height: 8, borderRadius: 4, background: currentSlide === i ? 'white' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }} aria-label={`Slide ${i + 1}`} />
            ))}
        </div>
      </div>

      {/* Right Column: Form */}
      <div style={{ width: '100%', maxWidth: '650px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: 'var(--background)', overflowY: 'auto' }}>
        <section style={{ width: '100%', maxWidth: 480 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ width: 64, height: 64, background: 'var(--primary-container)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', boxShadow: '0 8px 24px rgba(46,125,50,0.25)' }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 36, color: 'white' }}>volunteer_activism</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>AnnaDaan</h1>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>Nourishing communities, one verified meal at a time.</p>
          </div>

          {/* Role Selector */}
          <div style={{ background: 'var(--surface-container-low)', padding: '0.375rem', borderRadius: 'var(--radius-full)', display: 'flex', gap: '0.25rem', marginBottom: '2rem' }}>
            {(['donor', 'ngo', 'admin'] as Role[]).map(r => (
              <button key={r} type="button" onClick={() => setRole(r)} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-full)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-headline)', fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.25s', background: role === r ? 'var(--primary-container)' : 'transparent', color: role === r ? 'white' : 'var(--on-surface-variant)', boxShadow: role === r ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}>
                {r === 'admin' ? 'FSSAI' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Registration extra fields */}
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-with-icon">
                    <span className="material-symbols-outlined input-icon">person</span>
                    <input className="form-input" name="name" placeholder="Your full name" value={form.name} onChange={handleChange} required />
                  </div>
                </div>
                {role === 'donor' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Organization/Restaurant Name</label>
                      <div className="input-with-icon">
                        <span className="material-symbols-outlined input-icon">corporate_fare</span>
                        <input className="form-input" name="organization_name" placeholder="e.g. The Spice Route" value={form.organization_name} onChange={handleChange} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">FSSAI License (optional)</label>
                      <div className="input-with-icon">
                        <span className="material-symbols-outlined input-icon">verified</span>
                        <input className="form-input" name="fssai_license" placeholder="22-digit FSSAI number" value={form.fssai_license} onChange={handleChange} />
                      </div>
                    </div>
                  </>
                )}
                {role === 'ngo' && (
                  <div className="form-group">
                    <label className="form-label">NGO Registration Number</label>
                    <div className="input-with-icon">
                      <span className="material-symbols-outlined input-icon">badge</span>
                      <input className="form-input" name="registration_number" placeholder="Registration number" value={form.registration_number} onChange={handleChange} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <div className="input-with-icon">
                    <span className="material-symbols-outlined input-icon">phone</span>
                    <input className="form-input" name="phone" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} required />
                  </div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">alternate_email</span>
                <input className="form-input" name="email" type="email" placeholder="name@example.com" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                {mode === 'login' && <a href="#" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Forgot password?</a>}
              </div>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">lock</span>
                <input className="form-input" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required />
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '0.5rem', padding: '1rem', fontSize: '1rem' }} disabled={loading}>
              {loading ? <span className="animate-spin" style={{ width: 22, height: 22, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} /> : null}
              {mode === 'login' ? 'Sign Into Portal' : 'Create Account'}
              <span className="material-symbols-outlined">{mode === 'login' ? 'login' : 'person_add'}</span>
            </button>

            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>
                {mode === 'login' ? "New to AnnaDaan? " : "Already registered? "}
                <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); clearError() }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {mode === 'login' ? 'Create an Account' : 'Sign In instead'}
                </button>
              </p>
            </div>
          </form>

          {/* FSSAI Footer */}
          <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: 24 }}>verified</span>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>FSSAI Governed Platform</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Food Safety & Standards Authority</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
