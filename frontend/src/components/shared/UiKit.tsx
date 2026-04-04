import React, { useEffect, useState } from 'react'

interface CountdownProps {
  expiryTimestamp: string
  className?: string
}

export const Countdown: React.FC<CountdownProps> = ({ expiryTimestamp, className }) => {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgencyClass, setUrgencyClass] = useState('safe')

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiryTimestamp).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('EXPIRED'); setUrgencyClass('urgent'); return }

      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)

      if (h < 1) setUrgencyClass('urgent')
      else if (h < 4) setUrgencyClass('warning')
      else setUrgencyClass('safe')
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [expiryTimestamp])

  return (
    <span className={`countdown ${urgencyClass} ${className || ''}`}>
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>timer</span>
      {timeLeft}
    </span>
  )
}

interface StatusBadgeProps {
  status: string
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'badge-pending' },
  matched: { label: 'Matched', cls: 'badge-matched' },
  in_transit: { label: 'In Transit', cls: 'badge-in-transit' },
  delivered: { label: 'Delivered', cls: 'badge-delivered' },
  expired: { label: 'Expired', cls: 'badge-expired' },
  flagged: { label: 'Flagged', cls: 'badge-flagged' },
  safe: { label: 'Safe', cls: 'badge-safe' },
  open: { label: 'Open', cls: 'badge-matched' },
  fulfilled: { label: 'Fulfilled', cls: 'badge-delivered' },
  cancelled: { label: 'Cancelled', cls: 'badge-expired' },
  verified: { label: 'Verified', cls: 'badge-in-transit' },
  suspended: { label: 'Suspended', cls: 'badge-expired' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_MAP[status] || { label: status, cls: 'badge-pending' }
  return <span className={`badge ${config.cls}`}>{config.label}</span>
}

interface AgentBadgeProps { agent: string }
export const AgentBadge: React.FC<AgentBadgeProps> = ({ agent }) => {
  const cls = agent.toLowerCase().replace('agent', '').trim()
  return <span className={`agent-badge ${cls}`}>{agent}</span>
}

interface UrgencyRingProps { score: number }
export const UrgencyRing: React.FC<UrgencyRingProps> = ({ score }) => {
  const cls = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  return <div className={`urgency-ring ${cls}`}>{score}</div>
}

interface StatCardProps {
  icon: string
  label: string
  value: string | number
  delta?: string
  positive?: boolean
  iconBg?: string
  iconColor?: string
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, delta, positive, iconBg, iconColor }) => (
  <div className="stat-card card fade-in">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)',
        background: iconBg || 'color-mix(in srgb, var(--primary) 12%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor || 'var(--primary)'
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
      </div>
      {delta && (
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: positive !== false ? 'var(--primary)' : 'var(--secondary)', background: positive !== false ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'color-mix(in srgb, var(--secondary) 8%, transparent)', padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '2px' }}>
          {positive !== false ? '↑' : '↓'} {delta}
        </span>
      )}
    </div>
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
  </div>
)

interface EmptyStateProps { icon: string; title: string; description: string; action?: React.ReactNode }
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--on-surface-variant)' }}>
    <span className="material-symbols-outlined" style={{ fontSize: 56, marginBottom: '1rem', display: 'block', color: 'var(--outline-variant)' }}>{icon}</span>
    <h4 style={{ fontFamily: 'var(--font-headline)', marginBottom: '0.5rem', color: 'var(--on-surface)' }}>{title}</h4>
    <p style={{ fontSize: '0.9375rem', maxWidth: 320, margin: '0 auto 1.5rem' }}>{description}</p>
    {action}
  </div>
)

interface LoadingSpinnerProps { size?: number }
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 32 }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
    <div style={{ width: size, height: size, border: `3px solid var(--surface-container-high)`, borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="animate-spin" />
  </div>
)

interface DynamicFoodImageProps {
  photoUrl?: string
  foodName: string
  fallbackType?: string
  className?: string
  style?: React.CSSProperties
}

export const DynamicFoodImage: React.FC<DynamicFoodImageProps> = ({ photoUrl, foodName, fallbackType, className, style }) => {
  const [src, setSrc] = useState(photoUrl)
  
  useEffect(() => {
    // If there is no photoUrl immediately on mount, fetch a dynamic one based on foodName!
    if (!src || src.includes('loremflickr')) {
      let active = true
      // Need a client call to fetch image url via backend endpoint
      import('@/api/client').then(({ default: api }) => {
        api.post('/donations/image', { food_name: foodName })
          .then(res => {
            if (active && res.data.photo_url && !res.data.photo_url.includes('loremflickr')) {
              setSrc(res.data.photo_url)
            }
          })
          .catch(() => {})
      })
      return () => { active = false }
    }
  }, [src, foodName])

  // If fetching hasn't resolved yet, show a clean generic placeholder logic or let it stay broken,
  // but we can provide an initial quick Unsplash URL so it looks good until Gemini responds!
  let displaySrc = src
  if (!displaySrc || displaySrc.includes('loremflickr')) {
    const FOOD_IMAGES: Record<string, string> = {
      cooked_meals: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=200&fit=crop',
      bakery_items: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&fit=crop',
      raw_produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&fit=crop',
      packaged_food: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6b?w=200&fit=crop',
    }
    displaySrc = FOOD_IMAGES[fallbackType || ''] || FOOD_IMAGES.packaged_food
  }

  return <img src={displaySrc} alt={foodName} className={className} style={style} />
}
