import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, Countdown, LoadingSpinner, EmptyState, DynamicFoodImage } from '@/components/shared/UiKit'
import api from '@/api/client'

const donorNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/donor' },
  { icon: 'restaurant', label: 'Donate Food', path: '/donor/donate' },
  { icon: 'history', label: 'My Donations', path: '/donor/history' },
  { icon: 'location_on', label: 'Live Tracking', path: '/donor/tracking' },
]

export const DonationHistory: React.FC = () => {
  const [donations, setDonations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.get('/donations/my').then(r => setDonations(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? donations : donations.filter(d => d.status === filter)

  const FOOD_IMAGES: Record<string, string> = {
    cooked_meals: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=100&fit=crop',
    bakery_items: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100&fit=crop',
    raw_produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&fit=crop',
    packaged_food: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6b?w=100&fit=crop',
  }
  const getImg = (type: string) => FOOD_IMAGES[type] || FOOD_IMAGES['packaged_food']

  const statusSteps = ['pending', 'matched', 'in_transit', 'delivered']
  const stepIdx = (status: string) => statusSteps.indexOf(status)

  return (
    <div className="app-layout">
      <Sidebar navItems={donorNav} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>My Donation History</h2>
          <a href="/donor/donate" className="btn btn-primary btn-sm">+ New Donation</a>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {['all', 'pending', 'matched', 'in_transit', 'delivered', 'expired'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)', border: `1px solid ${filter === s ? 'var(--primary)' : 'var(--outline-variant)'}`, background: filter === s ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'white', color: filter === s ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: filter === s ? 700 : 400, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.15s' }}>
              {s === 'all' ? `All (${donations.length})` : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon="history" title="No donations found" description="No donations match this filter." action={<a href="/donor/donate" className="btn btn-primary">Make Your First Donation</a>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(d => (
              <div key={d._id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  <DynamicFoodImage photoUrl={d.photo_url} foodName={d.food_name} fallbackType={d.food_type} style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.0625rem', marginBottom: '0.125rem' }}>{d.food_name}</h4>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)' }}>{d.quantity} {d.unit} • {d.food_type?.replace('_', ' ')}</p>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>

                    {/* Step tracker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0', margin: '0.875rem 0', maxWidth: 500 }}>
                      {statusSteps.map((step, i) => (
                        <React.Fragment key={step}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: i <= stepIdx(d.status) ? 'var(--primary)' : 'var(--surface-container-high)', color: i <= stepIdx(d.status) ? 'white' : 'var(--on-surface-variant)', boxShadow: '0 0 0 3px var(--background)' }}>
                              {i < stepIdx(d.status) ? <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span> : i + 1}
                            </div>
                            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: i <= stepIdx(d.status) ? 'var(--primary)' : 'var(--on-surface-variant)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{step.replace('_', ' ')}</span>
                          </div>
                          {i < statusSteps.length - 1 && <div style={{ flex: 1, height: 2, background: i < stepIdx(d.status) ? 'var(--primary)' : 'var(--surface-container-high)', margin: '0 4px', marginBottom: 16 }} />}
                        </React.Fragment>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--on-surface-variant)', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{new Date(d.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      {d.expiry_timestamp && d.status !== 'delivered' && d.status !== 'expired' && (
                        <Countdown expiryTimestamp={d.expiry_timestamp} />
                      )}
                      {d.urgency_score >= 70 && <span className="badge badge-urgent">⚡ URGENT</span>}
                      {d.safety_status === 'flagged' && <span className="badge badge-flagged">⚠ Safety Flag</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
