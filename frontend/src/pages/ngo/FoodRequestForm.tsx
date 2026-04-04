import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import api from '@/api/client'
import { useAuthStore } from '@/store/authStore'

const ngoNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/ngo' },
  { icon: 'fastfood', label: 'Available Donations', path: '/ngo/donations' },
  { icon: 'pending_actions', label: 'My Requests', path: '/ngo/requests' },
  { icon: 'task_alt', label: 'Accepted', path: '/ngo/accepted' },
  { icon: 'local_shipping', label: 'Tracking', path: '/ngo/tracking' },
]

export const FoodRequestForm: React.FC = () => {
  const { user } = useAuthStore()
  const [requests, setRequests] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ food_type_needed: '', quantity_needed: '', unit: 'kg', urgency: 'medium', notes: '', preferred_datetime: '' })

  useEffect(() => {
    api.get('/ngo/requests/my').then(r => setRequests(r.data)).catch(console.error)
  }, [success])

  const set = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/ngo/requests', form)
      setSuccess(true)
      setForm({ food_type_needed: '', quantity_needed: '', unit: 'kg', urgency: 'medium', notes: '', preferred_datetime: '' })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  const urgencyColors: Record<string, string> = {
    high: 'var(--error)', medium: 'var(--secondary)', low: 'var(--primary)'
  }

  return (
    <div className="app-layout">
      <Sidebar navItems={ngoNav} />
      <main className="main-content" style={{ maxWidth: 800 }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Raise a Food Request</h2>
        <p style={{ color: 'var(--on-surface-variant)', marginBottom: '2rem' }}>Submit your food requirements. FSSAI admin and nearby donors will be notified.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
          {/* Form */}
          <form className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Food Type Needed</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">category</span>
                <input className="form-input" placeholder="e.g. Cooked meals, Rice, Pulses..." value={form.food_type_needed} onChange={e => set('food_type_needed', e.target.value)} required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Quantity Required</label>
                <input className="form-input" type="number" placeholder="100" value={form.quantity_needed} onChange={e => set('quantity_needed', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                  <option value="kg">Kilograms</option>
                  <option value="servings">Servings</option>
                  <option value="boxes">Boxes</option>
                  <option value="liters">Liters</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {['low', 'medium', 'high'].map(u => (
                  <button key={u} type="button" onClick={() => set('urgency', u)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: `2px solid ${form.urgency === u ? urgencyColors[u] : 'transparent'}`, background: form.urgency === u ? `color-mix(in srgb, ${urgencyColors[u]} 8%, transparent)` : 'var(--surface-container-low)', color: form.urgency === u ? urgencyColors[u] : 'var(--on-surface-variant)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Date & Time</label>
              <input className="form-input" type="datetime-local" value={form.preferred_datetime} onChange={e => set('preferred_datetime', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea className="form-textarea" placeholder="Any specific requirements, dietary restrictions, etc." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            {success && (
              <div style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', padding: '0.875rem', borderRadius: 'var(--radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined icon-filled">check_circle</span>
                Request submitted! FSSAI admin has been notified.
              </div>
            )}

            <button type="submit" className="btn btn-secondary btn-full" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Food Request'}
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>

          {/* Past requests */}
          <div>
            <h4 style={{ marginBottom: '1rem' }}>My Recent Requests</h4>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: '0.5rem', color: 'var(--outline-variant)' }}>pending_actions</span>
                <p style={{ fontSize: '0.875rem' }}>No requests yet</p>
              </div>
            ) : requests.slice(0, 5).map(req => (
              <div key={req._id} style={{ background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem', border: `1px solid color-mix(in srgb, ${urgencyColors[req.urgency] || 'var(--outline-variant)'} 30%, transparent)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{req.food_type_needed}</div>
                  <span style={{ padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', background: `color-mix(in srgb, ${urgencyColors[req.urgency] || 'var(--primary)'} 15%, transparent)`, color: urgencyColors[req.urgency] || 'var(--primary)', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase' }}>{req.urgency}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{req.quantity_needed} {req.unit}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem', fontFamily: 'var(--font-mono)' }}>{new Date(req.created_at).toLocaleDateString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
