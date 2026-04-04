import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'

interface NavItem { icon: string; label: string; path: string }

interface SidebarProps {
  navItems: NavItem[]
  footerItems?: NavItem[]
  accentClass?: string
  ctaLabel?: string
  ctaAction?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  navItems, footerItems, accentClass = 'active', ctaLabel, ctaAction
}) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  useEffect(() => {
    api.get('/auth/notifications').then(r => setNotifications(r.data)).catch(() => {})
  }, [])

  const markAllRead = async () => {
    try {
      await api.post('/auth/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch (e) {
      console.error('Failed to mark all as read')
    }
  }

  const clearNotifications = async () => {
    try {
      await api.post('/auth/notifications/clear')
      setNotifications([])
    } catch (e) {
      console.error('Failed to clear notifications')
    }
  }

  const markSingleRead = async (notifId: string) => {
    try {
      await api.patch(`/auth/notifications/${notifId}/read`)
      setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n))
    } catch (e) {
      console.error('Failed to mark as read')
    }
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 22 }}>volunteer_activism</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, color: 'var(--primary-container)', fontSize: '1.05rem', lineHeight: 1.1 }}>AnnaDaan</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
              {user?.role === 'admin' ? 'FSSAI Authority' : user?.role === 'ngo' ? 'Verified Steward' : 'Donor Portal'}
            </div>
          </div>
        </div>

        {ctaLabel && (
          <button className="btn btn-secondary btn-full" style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }} onClick={ctaAction}>
            {ctaLabel}
          </button>
        )}

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" style={{ position: 'relative' }} onClick={() => setNotifOpen(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
            <span>Notifications</span>
            {unread > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--secondary-container)', color: 'var(--on-secondary)', borderRadius: 'var(--radius-full)', padding: '0 0.375rem', fontSize: '0.7rem', fontWeight: 700 }}>
                {unread}
              </span>
            )}
          </button>
          {footerItems?.map(item => (
            <Link key={item.path} to={item.path} className="nav-item">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <button className="nav-item" onClick={() => { logout(); navigate('/auth') }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            <span>Sign Out</span>
          </button>
          <div style={{ padding: '0.75rem', marginTop: '0.5rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signed in as</div>
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          </div>
        </div>
      </aside>

      {/* Notification Drawer */}
      {notifOpen && (
        <>
          <div className="overlay-backdrop" onClick={() => setNotifOpen(false)} />
          <div className={`notif-drawer ${notifOpen ? 'open' : ''}`}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--surface-container)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontFamily: 'var(--font-headline)', margin: 0 }}>Notifications</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => setNotifOpen(false)} style={{ padding: '0.25rem' }}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-sm" 
                  onClick={markAllRead} 
                  disabled={unread === 0}
                  style={{ flex: 1, border: '1px solid var(--outline-variant)', fontSize: '0.75rem', padding: '0.375rem', background: 'transparent' }}
                >
                  Mark all read
                </button>
                <button 
                  className="btn btn-sm btn-ghost" 
                  onClick={clearNotifications}
                  disabled={notifications.length === 0}
                  style={{ flex: 1, border: '1px solid var(--outline-variant)', fontSize: '0.75rem', padding: '0.375rem', color: 'var(--error)' }}
                >
                  Clear all
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, marginBottom: '0.5rem', display: 'block' }}>notifications_none</span>
                  <p>No notifications yet</p>
                </div>
              ) : notifications.map((n, i) => {
                const isThankYou = n.type === 'thank_you'
                return (
                  <div
                    key={n._id || i}
                    className={`notif-item ${!n.read ? 'unread' : ''}`}
                    onClick={() => { if (!n.read) markSingleRead(n._id) }}
                    style={{
                      cursor: !n.read ? 'pointer' : 'default',
                      ...(isThankYou ? {
                        background: 'linear-gradient(135deg, rgba(13,99,27,0.07), rgba(102,187,106,0.05))',
                        borderLeft: '3px solid #2E7D32',
                      } : {}),
                    }}
                  >
                    {/* Thank-you special header */}
                    {isThankYou && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: 18 }}>🙏</span>
                        <span style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2E7D32' }}>Thank You from AnnaDaan</span>
                      </div>
                    )}

                    {/* Message — preserves \n line breaks */}
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: !n.read ? 600 : 400,
                      whiteSpace: 'pre-line',
                      lineHeight: 1.55,
                      color: isThankYou ? 'var(--on-surface)' : undefined,
                    }}>
                      {n.message}
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: '0.6875rem', color: 'var(--on-surface-variant)', marginTop: '0.375rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      {!n.read && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isThankYou ? '#2E7D32' : 'var(--primary)', display: 'inline-block', flexShrink: 0 }} />
                      )}
                      {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
