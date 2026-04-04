import React, { useState, useEffect } from 'react'
import { Sidebar } from '@/components/shared/Sidebar'
import { AgentBadge, LoadingSpinner, EmptyState } from '@/components/shared/UiKit'
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

const AGENT_ICONS: Record<string, { icon: string; color: string }> = {
  InputAgent: { icon: 'upload_file', color: 'var(--admin-accent)' },
  MatchingAgent: { icon: 'psychology', color: 'var(--primary)' },
  NotificationAgent: { icon: 'notifications', color: 'var(--secondary)' },
  RoutingAgent: { icon: 'directions', color: 'var(--tertiary)' },
  Orchestrator: { icon: 'account_tree', color: '#7B1FA2' },
  AdminOverride: { icon: 'admin_panel_settings', color: 'var(--error)' },
}

export const AgentLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [liveMode, setLiveMode] = useState(false)

  const fetchLogs = () => {
    api.get(`/admin/agent-logs?page=${page}&per_page=30`)
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [page])
  useEffect(() => {
    if (!liveMode) return
    const interval = setInterval(fetchLogs, 3000)
    return () => clearInterval(interval)
  }, [liveMode, page])

  const getAgentConfig = (name: string) => AGENT_ICONS[name] || { icon: 'smart_toy', color: 'var(--on-surface-variant)' }

  return (
    <div className="app-layout">
      <Sidebar navItems={adminNav} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>AI Agent Activity Log</h2>
            <p style={{ color: 'var(--on-surface-variant)' }}>Real-time log of every orchestrator action, decision, and reasoning for FSSAI audit trail.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
              <span className={`animate-${liveMode ? 'pulse' : ''}`} style={{ width: 8, height: 8, borderRadius: '50%', background: liveMode ? 'var(--error)' : 'var(--outline-variant)', display: 'inline-block' }} />
              Live Mode
              <input type="checkbox" checked={liveMode} onChange={e => setLiveMode(e.target.checked)} style={{ display: 'none' }} />
            </label>
            <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span> Refresh
            </button>
          </div>
        </div>

        {/* Agent Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
          {Object.entries(AGENT_ICONS).map(([name, { icon, color }]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', background: `color-mix(in srgb, ${color} 10%, transparent)`, borderRadius: 'var(--radius-full)', border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>{icon}</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>{name}</span>
            </div>
          ))}
        </div>

        {loading ? <LoadingSpinner /> : logs.length === 0 ? (
          <EmptyState icon="terminal" title="No agent logs yet" description="Submit a donation to trigger the AI orchestration pipeline. All agent actions will appear here." />
        ) : (
          <div className="card" style={{ padding: '0' }}>
            {logs.map((log, i) => {
              const agentConf = getAgentConfig(log.agent_name)
              const isFirst = i === 0
              return (
                <div key={log._id} className="log-entry" style={{ padding: '1.125rem 1.5rem', borderBottom: i < logs.length - 1 ? '1px solid var(--surface-container)' : 'none', animation: isFirst && liveMode ? 'fadeIn 0.5s ease' : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginTop: '2px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: agentConf.color }} />
                    {i < logs.length - 1 && <div style={{ width: 1, height: '100%', background: 'var(--surface-container-high)', minHeight: 20 }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.125rem 0.625rem', borderRadius: 'var(--radius-full)', background: `color-mix(in srgb, ${agentConf.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${agentConf.color} 20%, transparent)` }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, color: agentConf.color }}>{agentConf.icon}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: agentConf.color, fontWeight: 600 }}>{log.agent_name}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', background: 'var(--surface-container)', color: 'var(--on-surface-variant)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>{log.action}</span>
                      {log.donation_id && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--on-surface-variant)' }}>ID: ...{log.donation_id.slice(-8)}</span>
                      )}
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--on-surface-variant)' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN', { hour12: false, month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--on-surface)' }}>In: </span>{log.input_summary}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--primary)' }}>
                      <span style={{ fontWeight: 600 }}>Out: </span>{log.output_summary}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 30 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <span className="material-symbols-outlined">chevron_left</span> Prev
            </button>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
              Page {page} of {Math.ceil(total / 30)} • {total} logs
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>
              Next <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
