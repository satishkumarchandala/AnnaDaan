import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatCard, Countdown, StatusBadge, EmptyState, LoadingSpinner, DynamicFoodImage } from '@/components/shared/UiKit'
import api from '@/api/client'
import { useAuthStore } from '@/store/authStore'

const donorNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/donor' },
  { icon: 'restaurant', label: 'Donate Food', path: '/donor/donate' },
  { icon: 'history', label: 'My Donations', path: '/donor/history' },
  { icon: 'location_on', label: 'Live Tracking', path: '/donor/tracking' },
]

export const DonorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<any>(null)
  const [donations, setDonations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/donor/stats'),
      api.get('/donations/my')
    ]).then(([statsRes, donRes]) => {
      setStats(statsRes.data)
      setDonations(donRes.data)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const active = donations.filter(d => ['pending', 'matched', 'in_transit'].includes(d.status))
  const FOOD_IMAGES: Record<string, string> = {
    'cooked meals': 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=200&fit=crop',
    'bakery items': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&fit=crop',
    'raw produce': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&fit=crop',
    'packaged food': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6b?w=200&fit=crop',
    'beverages': 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=200&fit=crop',
  }
  const getImg = (type: string) => FOOD_IMAGES[type?.toLowerCase()] || FOOD_IMAGES['packaged food']

  return (
    <div className="app-layout">
      <Sidebar navItems={donorNav} ctaLabel="+ Donate Food" ctaAction={() => window.location.href = '/donor/donate'} footerItems={[{ icon: 'settings', label: 'Settings', path: '/donor/settings' }]} />
      <main className="main-content">
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.375rem' }}>Welcome back, {user?.name?.split(' ')[0]}. 👋</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '1.0625rem' }}>
              Your stewardship has provided <strong style={{ color: 'var(--primary)' }}>{stats?.total_meals_served || 0} meals</strong> to families in need.
            </p>
          </div>
          {stats?.profile?.fssai_license && (
            <div style={{ background: 'var(--surface-container-low)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: 18 }}>verified</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>FSSAI: {stats.profile.fssai_license}</span>
            </div>
          )}
        </header>

        {loading ? <LoadingSpinner /> : (
          <>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
              <StatCard icon="volunteer_activism" label="Total Donations" value={stats?.total_donations || 0} delta="12%" positive />
              <StatCard icon="scale" label="Food Donated (kg)" value={stats?.total_kg_donated || 0} delta="8%" positive iconBg="color-mix(in srgb, var(--secondary) 12%, transparent)" iconColor="var(--secondary)" />
              <StatCard icon="restaurant_menu" label="Meals Served" value={stats?.total_meals_served || 0} delta="24%" positive iconBg="color-mix(in srgb, var(--primary-container) 15%, transparent)" iconColor="var(--primary-container)" />
              <StatCard icon="co2" label="CO₂ Saved (kg)" value={stats?.co2_saved_kg || 0} iconBg="color-mix(in srgb, var(--tertiary) 12%, transparent)" iconColor="var(--tertiary)" />
            </div>

            {/* Step progress tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'start' }}>
              {/* Active Donations */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3>My Active Donations</h3>
                  <Link to="/donor/history" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none' }}>View All →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {active.length === 0 ? (
                    <EmptyState icon="volunteer_activism" title="No active donations" description="Submit your first donation and help feed families in need." action={<Link to="/donor/donate" className="btn btn-primary">Donate Now</Link>} />
                  ) : active.map(d => (
                    <div key={d._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', transition: 'all 0.25s' }}>
                      <DynamicFoodImage photoUrl={d.photo_url} foodName={d.food_name} fallbackType={d.food_type} style={{ width: 80, height: 80, borderRadius: 'var(--radius-lg)', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                          <h4 style={{ fontSize: '1.0625rem' }}>{d.food_name}</h4>
                          <StatusBadge status={d.status} />
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>Qty: {d.quantity} {d.unit} • {d.food_type}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '0.75rem' }}>
                          <Countdown expiryTimestamp={d.expiry_timestamp} />
                          <Link to={`/donor/tracking`} style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Track Live <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Donate Card */}
              <div style={{ width: 280 }}>
                <QuickDonateCard />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="mobile-nav">
        {donorNav.map(item => (
          <a key={item.path} href={item.path} className={`mobile-nav-item ${window.location.pathname === item.path ? 'active' : ''}`}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}

const QuickDonateCard: React.FC = () => {
  const [expiryHours, setExpiryHours] = useState(6)
  return (
    <div className="card" style={{ padding: '1.75rem', background: 'var(--surface-container)', borderRadius: 'var(--radius-3xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 48, height: 48, background: 'var(--secondary-container)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(158,66,0,0.2)' }}>
          <span className="material-symbols-outlined icon-filled" style={{ color: 'white', fontSize: 22 }}>add_circle</span>
        </div>
        <h3 style={{ fontSize: '1.25rem' }}>Quick Donate</h3>
      </div>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Food Type</label>
          <select className="form-select">
            <option>Cooked Meal (Veg)</option>
            <option>Cooked Meal (Non-Veg)</option>
            <option>Raw Ingredients</option>
            <option>Bakery Items</option>
            <option>Packaged Food</option>
            <option>Beverages</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Quantity</label>
          <div className="input-with-icon">
            <span className="material-symbols-outlined input-icon">inventory_2</span>
            <input className="form-input" placeholder="e.g. 10 kg / 20 packs" />
          </div>
        </div>
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <label className="form-label">Expiry Window</label>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary)' }}>{expiryHours}h</span>
          </div>
          <input type="range" min={1} max={24} value={expiryHours} onChange={e => setExpiryHours(+e.target.value)} style={{ width: '100%', accentColor: 'var(--secondary)', cursor: 'pointer' }} />
        </div>
        <Link to="/donor/donate" className="btn btn-secondary btn-full" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          Full Donation Form →
        </Link>
      </form>
      <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--outline-variant)', textAlign: 'center' }}>
        <p style={{ fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--on-surface-variant)', fontFamily: 'Georgia, serif' }}>
          "Your last donation fed a family of four in need."
        </p>
      </div>
    </div>
  )
}
