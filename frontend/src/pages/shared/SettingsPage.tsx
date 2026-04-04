import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { LoadingSpinner } from '@/components/shared/UiKit'
import { useAuthStore } from '@/store/authStore'
import api from '@/api/client'

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore()
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
  const [draft,    setDraft]    = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    setLoading(true)
    api.get('/auth/me')
      .then(r => {
        const d = { name: r.data.name || '', email: r.data.email || '', phone: r.data.phone || '' }
        setFormData(d)
        setDraft(d)
      })
      .catch(() => {
        const d = { name: user?.name || '', email: user?.email || '', phone: '' }
        setFormData(d)
        setDraft(d)
      })
      .finally(() => setLoading(false))
  }, [user])

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const handleEdit = () => {
    setDraft({ ...formData })   // reset draft to current saved values
    setEditing(true)
  }

  const handleCancel = () => {
    setDraft({ ...formData })
    setEditing(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/auth/profile', draft)
      setFormData({ ...draft })
      setEditing(false)
      showToast('Profile updated successfully ✓')
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Failed to update profile', false)
    } finally {
      setSaving(false)
    }
  }

  // Sidebar nav
  const getNav = () => {
    if (user?.role === 'admin') return [
      { icon: 'dashboard',         label: 'Overview',        path: '/admin' },
      { icon: 'volunteer_activism',label: 'All Donations',   path: '/admin/donations' },
      { icon: 'person',            label: 'Donors',          path: '/admin/donors' },
      { icon: 'groups',            label: 'NGOs',            path: '/admin/ngos' },
      { icon: 'restaurant',        label: 'Food Requests',   path: '/admin/requests' },
      { icon: 'terminal',          label: 'AI Logs',         path: '/admin/logs' },
      { icon: 'warning',           label: 'Alerts',          path: '/admin/alerts' },
    ]
    if (user?.role === 'ngo') return [
      { icon: 'dashboard',       label: 'Dashboard',          path: '/ngo' },
      { icon: 'fastfood',        label: 'Available Donations',path: '/ngo/donations' },
      { icon: 'pending_actions', label: 'My Requests',        path: '/ngo/requests' },
      { icon: 'task_alt',        label: 'Accepted',           path: '/ngo/accepted' },
      { icon: 'local_shipping',  label: 'Tracking',           path: '/ngo/tracking' },
    ]
    return [
      { icon: 'dashboard',   label: 'Dashboard',    path: '/donor' },
      { icon: 'restaurant',  label: 'Donate Food',  path: '/donor/donate' },
      { icon: 'history',     label: 'My Donations', path: '/donor/history' },
      { icon: 'location_on', label: 'Live Tracking',path: '/donor/tracking' },
    ]
  }

  const prefixPath = user?.role === 'admin' ? '/admin' : user?.role === 'ngo' ? '/ngo' : '/donor'

  const field = (key: 'name' | 'phone') => (
    <input
      className="form-input"
      value={draft[key]}
      onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
      placeholder={key === 'name' ? 'Your full name or organisation' : '+91 XXXXX XXXXX'}
      style={{ fontSize: '0.9375rem' }}
    />
  )

  return (
    <div className="app-layout">
      <Sidebar
        navItems={getNav()}
        footerItems={[{ icon: 'settings', label: 'Settings', path: `${prefixPath}/settings` }]}
      />

      <main className="main-content">
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* Page header */}
          <header style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '0.25rem' }}>Account Settings</h2>
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9375rem' }}>
              View and manage your AnnaDaan account details
            </p>
          </header>

          {/* Toast */}
          {toast && (
            <div style={{
              position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 9998,
              background: toast.ok ? '#2E7D32' : 'var(--error)',
              color: 'white', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)', fontSize: '0.875rem', fontWeight: 600,
              animation: 'slideInRight 0.25s ease',
            }}>
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18 }}>
                {toast.ok ? 'check_circle' : 'error'}
              </span>
              {toast.msg}
            </div>
          )}

          {loading ? <LoadingSpinner /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* Profile card */}
              <div className="card" style={{ padding: '2rem' }}>

                {/* Avatar + header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: editing
                      ? 'color-mix(in srgb, var(--primary) 15%, white)'
                      : 'var(--primary-container)',
                    border: editing ? '2px solid var(--primary)' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.25s',
                  }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--on-primary-container)' }}>
                      {(editing ? draft.name : formData.name)?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.3rem 0' }}>
                      {editing ? draft.name || 'Editing…' : formData.name || 'User'}
                    </h3>
                    <span style={{
                      display: 'inline-block', padding: '0.15rem 0.625rem',
                      background: 'var(--surface-container-high)',
                      borderRadius: 'var(--radius-sm)', fontSize: '0.625rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--on-surface-variant)',
                    }}>
                      {user?.role} Account
                    </span>
                  </div>

                  {/* Edit / Cancel toggle */}
                  {!editing ? (
                    <button
                      onClick={handleEdit}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      Edit Details
                    </button>
                  ) : (
                    <button
                      onClick={handleCancel}
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--on-surface-variant)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      Cancel
                    </button>
                  )}
                </div>

                {/* ── READ MODE ── */}
                {!editing && (
                  <>
                    <h4 style={{ marginBottom: '1.125rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--surface-container)' }}>
                      Account Information
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {[
                        { icon: 'person', label: 'Full Name / Organisation', value: formData.name  || '—' },
                        { icon: 'email',  label: 'Email Address',            value: formData.email || '—' },
                        { icon: 'phone',  label: 'Phone Number',             value: formData.phone || '—' },
                        { icon: 'badge',  label: 'Role',                     value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—' },
                      ].map((row, i, arr) => (
                        <div key={row.label} style={{
                          display: 'flex', alignItems: 'center', gap: '1rem',
                          padding: '0.875rem 0',
                          borderBottom: i < arr.length - 1 ? '1px solid var(--surface-container-high)' : 'none',
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)', flexShrink: 0 }}>{row.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--on-surface-variant)', marginBottom: '0.125rem' }}>
                              {row.label}
                            </div>
                            <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{row.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* ── EDIT MODE ── */}
                {editing && (
                  <form onSubmit={handleSave}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      marginBottom: '1.25rem', padding: '0.625rem 0.875rem',
                      background: 'color-mix(in srgb, var(--primary) 6%, transparent)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid color-mix(in srgb, var(--primary) 18%, transparent)',
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>info</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 500 }}>
                        Edit your name and phone number below. Email cannot be changed.
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>

                      {/* Name */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--primary)' }}>person</span>
                          Full Name / Organisation
                        </label>
                        {field('name')}
                      </div>

                      {/* Email — locked */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--primary)' }}>email</span>
                          Email Address
                          <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--surface-container-high)', padding: '2px 6px', borderRadius: 4, color: 'var(--on-surface-variant)' }}>locked</span>
                        </label>
                        <input
                          className="form-input"
                          value={draft.email}
                          disabled
                          style={{ cursor: 'not-allowed', opacity: 0.55, fontSize: '0.9375rem' }}
                        />
                      </div>

                      {/* Phone */}
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--primary)' }}>phone</span>
                          Phone Number
                        </label>
                        {field('phone')}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button type="button" onClick={handleCancel} className="btn btn-ghost">
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 130 }}>
                        {saving ? (
                          <>
                            <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} className="animate-spin" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  )
}
