import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { Countdown, EmptyState, LoadingSpinner, DynamicFoodImage } from '@/components/shared/UiKit'
import api from '@/api/client'

const ngoNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/ngo' },
  { icon: 'fastfood', label: 'Available Donations', path: '/ngo/donations' },
  { icon: 'pending_actions', label: 'My Requests', path: '/ngo/requests' },
  { icon: 'task_alt', label: 'Accepted', path: '/ngo/accepted' },
  { icon: 'local_shipping', label: 'Tracking', path: '/ngo/tracking' },
]

const FOOD_IMAGES: Record<string, string> = {
  cooked_meals: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&fit=crop',
  bakery_items: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&fit=crop',
  raw_produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&fit=crop',
  packaged_food: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6b?w=300&fit=crop',
  beverages: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=300&fit=crop',
}
const getImg = (type: string) => FOOD_IMAGES[type?.toLowerCase().replace(' ', '_')] || FOOD_IMAGES['packaged_food']

export const NgoAvailableDonations: React.FC = () => {
  const [donations, setDonations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [radius, setRadius] = useState(50)
  const [foodFilter, setFoodFilter] = useState('all')
  const [sortBy, setSortBy] = useState('urgency')

  const fetchDonations = () => {
    setLoading(true)
    api.get(`/donations/available?radius=${radius}&sort=${sortBy}`)
      .then(r => setDonations(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDonations() }, [radius, sortBy])

  const handleAccept = async (donationId: string) => {
    setAccepting(donationId)
    try {
      await api.post(`/donations/${donationId}/accept`)
      fetchDonations()
    } catch (e: any) {
      alert(e.response?.data?.error || 'Could not accept')
    } finally {
      setAccepting(null)
    }
  }

  const handleDecline = async (donationId: string) => {
    await api.post(`/donations/${donationId}/decline`)
    fetchDonations()
  }

  const filtered = foodFilter === 'all' ? donations : donations.filter(d => d.food_type?.toLowerCase().includes(foodFilter))

  return (
    <div className="app-layout">
      <Sidebar navItems={ngoNav} ctaLabel="⬆ Raise Request" ctaAction={() => window.location.href = '/ngo/requests'} footerItems={[{ icon: 'settings', label: 'Settings', path: '/ngo/settings' }]} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Available Donations</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              {filtered.length} donation{filtered.length !== 1 ? 's' : ''} within {radius}km — ready to accept
            </p>
          </div>
          <button onClick={fetchDonations} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span> Refresh
          </button>
        </div>

        {/* Filter bar */}
        <div style={{ background: 'var(--surface-container-low)', borderRadius: 'var(--radius-xl)', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Radius */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Radius:</span>
              <div style={{ display: 'flex', background: 'var(--surface-container-highest)', padding: '0.25rem', borderRadius: 'var(--radius-md)', gap: '2px' }}>
                {[10, 25, 50, 100].map(r => (
                  <button key={r} onClick={() => setRadius(r)} style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem', background: radius === r ? 'white' : 'transparent', color: radius === r ? 'var(--primary)' : 'var(--on-surface-variant)', boxShadow: radius === r ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                    {r}km
                  </button>
                ))}
              </div>
            </div>
            {/* Food filters */}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {['all', 'cooked', 'raw', 'bakery', 'packaged'].map(f => (
                <button key={f} onClick={() => setFoodFilter(f)} style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', border: `1px solid ${foodFilter === f ? 'var(--primary)' : 'var(--outline-variant)'}`, background: foodFilter === f ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'white', color: foodFilter === f ? 'var(--primary)' : 'var(--on-surface-variant)', fontWeight: foodFilter === f ? 600 : 500, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Sort:</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'transparent', border: 'none', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--on-surface)', cursor: 'pointer', outline: 'none' }}>
              <option value="urgency">By Urgency</option>
              <option value="expiry">Earliest Expiry</option>
              <option value="distance">Closest First</option>
            </select>
          </div>
        </div>

        {/* Feed */}
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon="fastfood" title="No donations available" description="No food donations match your current radius and filters. Try increasing your search radius." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.25rem' }}>
            {filtered.map(d => (
              <article key={d._id} className="donation-card">
                <div style={{ width: 140, position: 'relative', flexShrink: 0 }}>
                  <DynamicFoodImage photoUrl={d.photo_url} foodName={d.food_name} fallbackType={d.food_type} className="donation-card-img" style={{ height: '100%', width: '100%' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12 }}>
                    <span style={{ padding: '0.25rem 0.625rem', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: 6, fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {d.food_type?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="donation-card-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1.0625rem', marginBottom: '0.25rem' }}>{d.food_name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                        {d.donor_name}
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: 'var(--primary)' }}>verified</span>
                      </div>
                    </div>
                    <div style={{ background: d.expiry_window_hours <= 2 ? 'color-mix(in srgb, var(--error) 10%, transparent)' : 'color-mix(in srgb, var(--secondary) 10%, transparent)', color: d.expiry_window_hours <= 2 ? 'var(--error)' : 'var(--secondary)', padding: '0.375rem 0.625rem', borderRadius: 'var(--radius-md)', textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expires In</div>
                      <Countdown expiryTimestamp={d.expiry_timestamp} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.625rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>weight</span>{d.quantity} {d.unit}
                    </span>
                    {d.distance_km && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.625rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>distance</span>{d.distance_km} km
                      </span>
                    )}
                    {d.storage_required && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.25rem 0.625rem', background: 'color-mix(in srgb, var(--admin-accent) 10%, transparent)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--admin-accent)', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>ac_unit</span>Refrigeration
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.625rem', marginTop: 'auto' }}>
                    <button className="btn btn-primary" style={{ flex: 1, padding: '0.625rem' }} onClick={() => handleAccept(d._id)} disabled={accepting === d._id}>
                      {accepting === d._id ? 'Accepting...' : 'Accept Donation'}
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ padding: '0.625rem 0.875rem' }} onClick={() => handleDecline(d._id)}>Decline</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
