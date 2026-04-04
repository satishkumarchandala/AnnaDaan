import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { LocationPicker } from '@/components/shared/LocationPicker'
import api from '@/api/client'

const donorNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/donor' },
  { icon: 'restaurant', label: 'Donate Food', path: '/donor/donate' },
  { icon: 'history', label: 'My Donations', path: '/donor/history' },
  { icon: 'location_on', label: 'Live Tracking', path: '/donor/tracking' },
]

const FOOD_CATEGORIES = [
  { key: 'cooked_meals', label: 'Cooked', icon: 'soup_kitchen' },
  { key: 'packaged_food', label: 'Packaged', icon: 'inventory_2' },
  { key: 'raw_produce', label: 'Raw Items', icon: 'eco' },
  { key: 'bakery_items', label: 'Bakery', icon: 'bakery_dining' },
  { key: 'beverages', label: 'Beverages', icon: 'local_cafe' },
]

const STEPS = ['Food Details', 'Pickup Info', 'Review & Submit']

export const DonationForm: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    food_type: 'cooked_meals',
    food_name: '',
    description: '',
    quantity: '',
    unit: 'servings',
    preparation_time: new Date().toISOString().slice(0, 16),
    expiry_window_hours: 6,
    storage_required: false,
    pickup_type: 'ngo_pickup',
    location: { lat: 28.6139, lng: 77.2090 },
    location_address: '',
    location_confirmed: false,
    photo_url: '',
  })
  
  React.useEffect(() => {
    let active = true;
    if (form.food_name && form.food_name.length > 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await api.post('/donations/image', { food_name: form.food_name });
          if (active && res.data.photo_url) {
            setForm(f => ({ ...f, photo_url: res.data.photo_url }));
          }
        } catch (e) {
          console.error("Failed to fetch image via Gemini", e);
        }
      }, 1000)
      return () => { active = false; clearTimeout(timer); }
    } else {
      setForm(f => ({ ...f, photo_url: '' }))
    }
  }, [form.food_name])

  const set = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async () => {
    setSubmitting(true); setError('')
    try {
      await api.post('/donations', form)
      setSuccess(true)
      setTimeout(() => navigate('/donor'), 2500)
    } catch (e: any) {
      setError(e.response?.data?.error || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) return (
    <div className="app-layout">
      <Sidebar navItems={donorNav} />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }} className="fade-in">
          <div style={{ width: 96, height: 96, background: 'color-mix(in srgb, var(--primary) 12%, transparent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 48, color: 'var(--primary)' }}>check_circle</span>
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>Donation Submitted!</h2>
          <p style={{ color: 'var(--on-surface-variant)', marginBottom: '1.5rem' }}>Our AI is now matching your donation with nearby NGOs. You'll be notified when a match is found.</p>
          <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: 'var(--primary)', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>psychology</span>
            AI Orchestrator processing...
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="app-layout">
      <Sidebar navItems={donorNav} />
      <main className="main-content" style={{ maxWidth: 680, margin: '0 auto', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2>Share a Meal 🍱</h2>
          <p style={{ color: 'var(--on-surface-variant)' }}>Complete your donation submission to help families in need today.</p>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem' }}>
          {STEPS.map((s, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', background: i === step ? 'var(--primary)' : i < step ? 'var(--primary-fixed-dim)' : 'var(--surface-container-high)', color: i <= step ? (i === step ? 'white' : 'var(--primary)') : 'var(--on-surface-variant)', boxShadow: '0 0 0 4px var(--background)' }}>
                  {i < step ? <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span> : i + 1}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--primary)' : 'var(--on-surface-variant)', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < step ? 'var(--primary)' : 'var(--surface-container-high)', margin: '0 0.5rem', position: 'relative', top: -12 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Food Details */}
        {step === 0 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>restaurant</span>
              Step 1: Food Details
            </h3>

            {/* Category Picker */}
            <div className="form-group">
              <label className="form-label">Food Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                {FOOD_CATEGORIES.map(cat => (
                  <button key={cat.key} type="button" onClick={() => set('food_type', cat.key)} style={{ padding: '0.875rem 0.5rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${form.food_type === cat.key ? 'var(--primary)' : 'transparent'}`, background: form.food_type === cat.key ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem', transition: 'all 0.2s' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ color: form.food_type === cat.key ? 'var(--primary)' : 'var(--on-surface-variant)', fontSize: 24 }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: form.food_type === cat.key ? 'var(--primary)' : 'var(--on-surface-variant)' }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '1rem', alignItems: 'flex-start' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Food Name</label>
                <input className="form-input" placeholder="e.g. Vegetable Biryani" value={form.food_name} onChange={e => set('food_name', e.target.value)} required />
                {form.photo_url && (
                  <div className="fade-in" style={{ marginTop: '0.75rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 140, backgroundImage: `url(${form.photo_url})`, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '0.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)', height: '100%', display: 'flex', alignItems: 'flex-end', color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, marginRight: 4 }}>photo_camera</span> Auto-matched from web
                    </div>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ height: '100%' }}>
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input" placeholder="Any additional details..." value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: form.photo_url ? '194px' : '44px', resize: 'vertical', transition: 'min-height 0.3s ease' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Quantity</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-input" type="number" placeholder="10" value={form.quantity} onChange={e => set('quantity', e.target.value)} style={{ flex: 1 }} required />
                  <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)} style={{ width: 110 }}>
                    <option value="servings">Servings</option>
                    <option value="kg">kg</option>
                    <option value="boxes">Boxes</option>
                    <option value="packs">Packs</option>
                    <option value="liters">Liters</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Preparation Time</label>
                <input className="form-input" type="datetime-local" value={form.preparation_time} onChange={e => set('preparation_time', e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Freshness Window</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700, background: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>Exp: {form.expiry_window_hours}h</span>
              </div>
              <input type="range" min={1} max={48} value={form.expiry_window_hours} onChange={e => set('expiry_window_hours', +e.target.value)} style={{ width: '100%', marginTop: '0.5rem', accentColor: 'var(--primary)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                <span>1h</span><span>24h</span><span>48h</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-container-low)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--admin-accent)' }}>ac_unit</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Needs Refrigeration?</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)' }}>FSSAI recommends cold chain for cooked food</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={form.storage_required} onChange={e => set('storage_required', e.target.checked)} />
                <div className="toggle-track"><div className="toggle-thumb" /></div>
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Pickup Info */}
        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>local_shipping</span>
              Step 2: Pickup Info
            </h3>

            {/* Pickup type selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { key: 'ngo_pickup', icon: 'volunteer_activism', label: 'NGO Pickup', desc: 'Verified partner collects it.' },
                { key: 'self_drop', icon: 'directions_run', label: 'Self-Drop', desc: 'You deliver to nearby NGO.' }
              ].map(opt => (
                <label key={opt.key} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="pickup_type" value={opt.key} checked={form.pickup_type === opt.key} onChange={() => set('pickup_type', opt.key)} style={{ display: 'none' }} />
                  <div style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', border: `2px solid ${form.pickup_type === opt.key ? 'var(--primary)' : 'transparent'}`, background: form.pickup_type === opt.key ? 'var(--surface-container-lowest)' : 'var(--surface-container-low)', transition: 'all 0.2s' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: form.pickup_type === opt.key ? 'var(--primary)' : 'var(--on-surface-variant)', marginBottom: '0.5rem', display: 'block' }}>{opt.icon}</span>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Location picker */}
            <LocationPicker
              value={{ coords: form.location, address: form.location_address }}
              onChange={(coords, address) => {
                setForm(f => ({
                  ...f,
                  location: coords,
                  location_address: address,
                  location_confirmed: true,
                }))
              }}
            />

            {/* FSSAI hint */}
            <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: 20 }}>info</span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
                Your precise GPS coordinates help the AI match you with the nearest available NGO for faster pickup.
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>verified</span>
              Step 3: Review & Submit
            </h3>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-container)' }}>
                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Item Details</div>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{form.quantity} {form.unit} • {form.food_name || 'Unnamed'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: '0.125rem' }}>
                    Prepared: {new Date(form.preparation_time).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Pickup</div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{form.pickup_type === 'ngo_pickup' ? 'NGO Pickup' : 'Self-Drop'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span className="badge badge-pending">Expiry: {form.expiry_window_hours}h</span>
                {form.storage_required && <span className="badge badge-matched">❄ Refrigeration</span>}
                <span className="badge badge-in-transit">{form.food_type.replace('_', ' ')}</span>
              </div>

              {/* Location summary in review */}
              {form.location_address && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--surface-container)', display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                  <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: 'var(--primary)', flexShrink: 0, marginTop: 2 }}>location_on</span>
                  <div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>Pickup Address</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5 }}>{form.location_address}</div>
                    <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--outline)', marginTop: '0.25rem' }}>
                      {form.location.lat.toFixed(5)}, {form.location.lng.toFixed(5)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FSSAI compliance notice */}
            <div style={{ background: 'var(--tertiary-fixed)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-fixed-variant)', fontSize: 22, flexShrink: 0, marginTop: 2 }}>gavel</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-tertiary-fixed)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>FSSAI Compliance Notice</div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--on-tertiary-fixed-variant)', lineHeight: 1.5 }}>By submitting, you confirm that the food is prepared in a hygienic environment and safe for consumption as per FSSAI guidelines. AnnaDaan acts as a bridge for donation distribution.</p>
              </div>
            </div>

            {error && <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>{error}</div>}
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
              <span className="material-symbols-outlined">chevron_left</span> Back
            </button>
          )}
          {step < 2 ? (
            <button
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 ? !form.food_name : step === 1 ? !form.location_address : false}
            >
              Continue <span className="material-symbols-outlined">chevron_right</span>
            </button>
          ) : (
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Donation'}
              <span className="material-symbols-outlined">check_circle</span>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
