import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import api from '@/api/client'

const ngoNav = [
  { icon: 'dashboard', label: 'Dashboard', path: '/ngo' },
  { icon: 'fastfood', label: 'Available Donations', path: '/ngo/donations' },
  { icon: 'pending_actions', label: 'My Requests', path: '/ngo/requests' },
  { icon: 'task_alt', label: 'Accepted', path: '/ngo/accepted' },
  { icon: 'local_shipping', label: 'Tracking', path: '/ngo/tracking' },
]

interface ConfirmDialogProps {
  delivery: any
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

const ConfirmDeliveryDialog: React.FC<ConfirmDialogProps> = ({ delivery, onConfirm, onCancel, loading }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
  }}>
    <div className="card" style={{
      maxWidth: 440, width: '100%', padding: '2rem',
      borderTop: '4px solid #2E7D32',
      animation: 'slideUp 0.25s ease'
    }}>
      {/* Icon */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 0.75rem',
          background: 'linear-gradient(135deg, rgba(46,125,50,0.15), rgba(102,187,106,0.2))',
          border: '2px solid rgba(46,125,50,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 32, color: '#2E7D32' }}>
            verified
          </span>
        </div>
        <h3 style={{ margin: '0 0 0.375rem', fontFamily: 'var(--font-headline)', fontSize: '1.1875rem' }}>
          Confirm Food Delivered
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
          Confirm that you have received the food from the donor. This will update the tracking
          for the donor and FSSAI authorities.
        </p>
      </div>

      {/* Delivery info */}
      <div style={{
        background: 'var(--surface-container)', borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem', marginBottom: '1.5rem',
        border: '1px solid var(--outline-variant)'
      }}>
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: '#2E7D32' }}>
            person
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
              Donor
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{delivery.donor_name || 'Unknown Donor'}</div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--outline-variant)', margin: '0.625rem 0' }} />
        <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: '#2E7D32' }}>
            schedule
          </span>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>
              Accepted At
            </div>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>
              {delivery.created_at
                ? new Date(delivery.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.625rem' }}>
        <button
          onClick={onCancel}
          disabled={loading}
          className="btn btn-ghost"
          style={{ flex: 1, border: '1px solid var(--outline-variant)' }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn"
          style={{
            flex: 2, background: 'linear-gradient(135deg, #2E7D32, #388E3C)',
            color: 'white', fontWeight: 700, gap: '0.5rem',
            boxShadow: '0 4px 16px rgba(46,125,50,0.35)',
            border: 'none'
          }}
          id="confirm-delivery-btn"
        >
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18 }}>
            {loading ? 'hourglass_empty' : 'check_circle'}
          </span>
          {loading ? 'Confirming…' : 'Yes, Food Received!'}
        </button>
      </div>
    </div>
  </div>
)

export const NgoAcceptedPage: React.FC = () => {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [marking, setMarking] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<any | null>(null)
  const [justDelivered, setJustDelivered] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get('/ngo/deliveries')
      .then(r => setDeliveries(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = statusFilter
    ? deliveries.filter(d => d.status === statusFilter)
    : deliveries

  const markDelivered = async () => {
    if (!confirmTarget) return
    const deliveryId = confirmTarget._id
    setMarking(deliveryId)
    try {
      await api.post(`/deliveries/${deliveryId}/deliver`)
      setDeliveries(prev =>
        prev.map(d =>
          d._id === deliveryId
            ? { ...d, status: 'delivered', delivered_at: new Date().toISOString() }
            : d
        )
      )
      setJustDelivered(deliveryId)
      setTimeout(() => setJustDelivered(null), 5000)
    } catch (e: any) {
      alert(e?.response?.data?.error || 'Failed to confirm delivery')
    } finally {
      setMarking(null)
      setConfirmTarget(null)
    }
  }

  const inTransit = deliveries.filter(d => d.status === 'in_transit').length
  const delivered = deliveries.filter(d => d.status === 'delivered').length

  return (
    <div className="app-layout">
      {confirmTarget && (
        <ConfirmDeliveryDialog
          delivery={confirmTarget}
          onConfirm={markDelivered}
          onCancel={() => setConfirmTarget(null)}
          loading={marking === confirmTarget._id}
        />
      )}

      <Sidebar
        navItems={ngoNav}
        ctaLabel="⬆ Raise Request"
        ctaAction={() => navigate('/ngo/requests')}
        footerItems={[{ icon: 'settings', label: 'Settings', path: '/ngo/settings' }]}
      />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Accepted Donations</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              All donations you've accepted — confirm receipt when food is delivered
            </p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Accepted', value: deliveries.length, color: 'var(--primary)', icon: 'volunteer_activism' },
            { label: 'In Transit', value: inTransit, color: '#9e4200', icon: 'local_shipping' },
            { label: 'Delivered', value: delivered, color: '#2E7D32', icon: 'check_circle' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${s.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            { value: '', label: 'All' },
            { value: 'in_transit', label: 'In Transit' },
            { value: 'delivered', label: 'Delivered' },
          ].map(s => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)}
              style={{
                padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)',
                border: `1px solid ${statusFilter === s.value ? 'var(--primary)' : 'var(--outline-variant)'}`,
                background: statusFilter === s.value ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'white',
                color: statusFilter === s.value ? 'var(--primary)' : 'var(--on-surface-variant)',
                fontSize: '0.8125rem', fontWeight: statusFilter === s.value ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s'
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon="task_alt" title="No accepted donations" description="Browse available donations and accept them to see them here." action={
            <button className="btn btn-primary" onClick={() => navigate('/ngo/donations')}>Browse Donations</button>
          } />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filtered.map(d => {
              const isJustDone = justDelivered === d._id
              return (
                <div key={d._id} className="card" style={{
                  padding: '1.25rem 1.5rem',
                  borderLeft: d.status === 'in_transit'
                    ? '4px solid #9e4200'
                    : '4px solid #2E7D32',
                  transition: 'all 0.3s ease',
                  background: isJustDone
                    ? 'linear-gradient(135deg, rgba(46,125,50,0.06), rgba(102,187,106,0.04))'
                    : undefined,
                  boxShadow: isJustDone ? '0 0 0 2px rgba(46,125,50,0.2)' : undefined
                }}>
                  {/* Just-delivered celebration banner */}
                  {isJustDone && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      background: 'linear-gradient(135deg, rgba(46,125,50,0.12), rgba(102,187,106,0.1))',
                      border: '1px solid rgba(46,125,50,0.25)',
                      borderRadius: 'var(--radius-md)', padding: '0.5rem 0.875rem',
                      marginBottom: '0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#2E7D32'
                    }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18 }}>celebration</span>
                      Food delivery confirmed! Donor & FSSAI have been notified.
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-headline)', fontSize: '1rem' }}>
                          From: {d.donor_name || 'Unknown Donor'}
                        </span>
                        <StatusBadge status={d.status} />
                      </div>
                      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>calendar_today</span>
                          Accepted: {d.created_at
                            ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                        {d.delivered_at && (
                          <span style={{ fontSize: '0.8125rem', color: '#2E7D32', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14 }}>check_circle</span>
                            Delivered: {new Date(d.delivered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {d.estimated_time && d.status === 'in_transit' && (
                          <span style={{ fontSize: '0.8125rem', color: '#9e4200', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timer</span>
                            ETA: ~{d.estimated_time} min
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                      {d.status === 'in_transit' && (
                        <>
                          <button
                            onClick={() => navigate('/ngo/tracking')}
                            className="btn btn-ghost btn-sm"
                            style={{ border: '1px solid var(--outline-variant)', gap: '0.375rem' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>my_location</span>
                            Track
                          </button>

                          {/* PRIMARY confirm delivery button */}
                          <button
                            id={`mark-delivered-${d._id}`}
                            onClick={() => setConfirmTarget(d)}
                            disabled={marking === d._id}
                            className="btn"
                            style={{
                              background: 'linear-gradient(135deg, #2E7D32, #388E3C)',
                              color: 'white', fontWeight: 700,
                              gap: '0.5rem', border: 'none',
                              boxShadow: '0 2px 12px rgba(46,125,50,0.35)',
                              padding: '0.5rem 1.125rem',
                              borderRadius: 'var(--radius-md)',
                              fontSize: '0.875rem'
                            }}
                          >
                            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16 }}>
                              {marking === d._id ? 'hourglass_empty' : 'inventory_2'}
                            </span>
                            {marking === d._id ? 'Confirming…' : 'Food Received'}
                          </button>
                        </>
                      )}

                      {d.status === 'delivered' && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          background: 'linear-gradient(135deg, rgba(46,125,50,0.1), rgba(102,187,106,0.08))',
                          border: '1px solid rgba(46,125,50,0.25)',
                          borderRadius: 'var(--radius-md)', padding: '0.375rem 0.875rem',
                          color: '#2E7D32', fontSize: '0.875rem', fontWeight: 700
                        }}>
                          <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18 }}>verified</span>
                          Delivered & Confirmed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
