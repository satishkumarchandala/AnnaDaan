import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { StatusBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
import api from '@/api/client'

const adminNav = [
  { icon: 'dashboard', label: 'Overview', path: '/admin' },
  { icon: 'volunteer_activism', label: 'All Donations', path: '/admin/donations' },
  { icon: 'person', label: 'Donors', path: '/admin/donors' },
  { icon: 'groups', label: 'NGOs', path: '/admin/ngos' },
  { icon: 'restaurant', label: 'Food Requests', path: '/admin/requests' },
  { icon: 'terminal', label: 'AI Logs', path: '/admin/logs' },
  { icon: 'warning', label: 'Alerts', path: '/admin/alerts' },
]

const URGENCY_CONFIG: Record<string, { color: string; bg: string }> = {
  immediate: { color: '#ba1a1a', bg: 'rgba(186,26,26,0.1)' },
  high:      { color: '#9e4200', bg: 'rgba(158,66,0,0.1)' },
  medium:    { color: '#1565C0', bg: 'rgba(21,101,192,0.1)' },
  low:       { color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' },
}

export const AdminFoodRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    const q = statusFilter ? `?status=${statusFilter}` : ''
    api.get(`/admin/ngo-requests${q}`)
      .then(r => setRequests(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Food Requests</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>NGO food supply requests awaiting fulfilment</p>
          </div>
          <button onClick={load} className="btn btn-ghost btn-sm" style={{ border: '1px solid var(--outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span> Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: requests.length, color: 'var(--primary)', icon: 'list_alt' },
            { label: 'Open', value: requests.filter(r => r.status === 'open').length, color: 'var(--admin-accent)', icon: 'radio_button_unchecked' },
            { label: 'Fulfilled', value: requests.filter(r => r.status === 'fulfilled').length, color: '#2E7D32', icon: 'check_circle' },
            { label: 'Cancelled', value: requests.filter(r => r.status === 'cancelled').length, color: '#ba1a1a', icon: 'cancel' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `color-mix(in srgb, ${s.color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 800, fontSize: '1.25rem' }}>{s.value}</div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-variant)' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {['', 'open', 'fulfilled', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '0.375rem 0.875rem', borderRadius: 'var(--radius-full)', border: `1px solid ${statusFilter === s ? 'var(--primary)' : 'var(--outline-variant)'}`, background: statusFilter === s ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'white', color: statusFilter === s ? 'var(--primary)' : 'var(--on-surface-variant)', fontSize: '0.8125rem', fontWeight: statusFilter === s ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap: '1.25rem', alignItems: 'start' }}>
          {loading ? <LoadingSpinner /> : requests.length === 0 ? (
            <EmptyState icon="restaurant" title="No food requests" description="No NGO requests match your filter." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requests.map(req => {
                const urg = URGENCY_CONFIG[req.urgency] || URGENCY_CONFIG.medium
                const isSel = selected?._id === req._id
                return (
                  <div key={req._id} onClick={() => setSelected(isSel ? null : req)} className="card"
                    style={{ padding: '1rem 1.25rem', cursor: 'pointer', borderLeft: `4px solid ${urg.color}`, background: isSel ? `color-mix(in srgb, ${urg.color} 5%, white)` : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--font-headline)' }}>{req.ngo_name}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: urg.bg, color: urg.color, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {req.urgency}
                          </span>
                          <StatusBadge status={req.status} />
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.875rem' }}><b>{req.food_type_needed}</b> — <span style={{ fontFamily: 'var(--font-mono)' }}>{req.quantity_needed} {req.unit}</span></span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                            {req.created_at ? new Date(req.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        {req.notes && <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginTop: '0.25rem', fontStyle: 'italic' }}>"{req.notes}"</p>}
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--outline-variant)' }}>{isSel ? 'expand_less' : 'chevron_right'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Detail panel */}
          {selected && (
            <div className="card fade-in" style={{ padding: '1.25rem', position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Request Detail</h4>
                <button className="btn btn-ghost btn-sm" style={{ padding: '0.25rem' }} onClick={() => setSelected(null)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
              {[
                { label: 'NGO', value: selected.ngo_name, icon: 'groups' },
                { label: 'Food Type', value: selected.food_type_needed, icon: 'restaurant' },
                { label: 'Quantity', value: `${selected.quantity_needed} ${selected.unit}`, icon: 'scale' },
                { label: 'Urgency', value: selected.urgency, icon: 'speed' },
                { label: 'Preferred Time', value: selected.preferred_datetime || 'Flexible', icon: 'schedule' },
                { label: 'Status', value: selected.status, icon: 'info' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)', marginTop: 2 }}>{row.icon}</span>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--on-surface-variant)' }}>{row.label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.value}</div>
                  </div>
                </div>
              ))}
              {selected.notes && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'color-mix(in srgb, var(--primary) 6%, transparent)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>NOTES</div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', margin: 0 }}>{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
