import { useState, useRef, useEffect } from 'react'
import api from '../../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { source: string; heading: string }[]
}

const SUGGESTED = [
  'How do I donate food?',
  'How does AI matching work?',
  'What is an urgency score?',
  'How do NGOs accept donations?',
  'What is the Dispatch All feature?',
]

export default function ChatbotWidget() {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm the AnnaDaan Assistant. Ask me anything about the platform — how donations work, AI matching, tracking, NGOs, admin features, and more!",
    },
  ])
  const [loading, setLoading] = useState(false)
  const [ready, setReady]     = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check if knowledge base is ready
  useEffect(() => {
    api.get('/chatbot/status').then(r => setReady(r.data.ready)).catch(() => setReady(false))
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [open, messages])

  const send = async (q?: string) => {
    const question = (q ?? input).trim()
    if (!question || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: question }
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.post('/chatbot/ask', {
        question,
        history,
      })
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.answer,
          sources: res.data.sources?.slice(0, 3),
        },
      ])
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '❌ Sorry, I encountered an error. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        id="chatbot-toggle-btn"
        onClick={() => setOpen(o => !o)}
        title="AnnaDaan Assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0d631b, #1a8a2c)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(13,99,27,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <span className="material-symbols-outlined icon-filled" style={{ color: '#fff', fontSize: 26 }}>
          {open ? 'close' : 'smart_toy'}
        </span>
        {/* Ready indicator */}
        {ready !== null && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 10, height: 10, borderRadius: '50%',
            background: ready ? '#4caf50' : '#ff9800',
            border: '2px solid #fff',
          }} />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id="chatbot-panel"
          style={{
            position: 'fixed', bottom: 92, right: 24, zIndex: 9998,
            width: 380, maxHeight: 560,
            borderRadius: 18, overflow: 'hidden',
            background: 'var(--surface-container, #fff)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.25s ease',
            border: '1px solid var(--outline-variant, rgba(0,0,0,0.12))',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0d631b, #1a8a2c)',
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span className="material-symbols-outlined icon-filled" style={{ color: '#fff', fontSize: 22 }}>smart_toy</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>AnnaDaan Assistant</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem' }}>
                {ready === null ? 'Checking knowledge base…' : ready ? '🟢 Knowledge base ready' : '🟡 Indexing documents…'}
              </div>
            </div>
            <button
              onClick={() => setMessages([messages[0]])}
              title="Clear chat"
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 13 }}
            >
              Clear
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            display: 'flex', flexDirection: 'column', gap: 10,
            maxHeight: 360,
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 13px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #0d631b, #1a8a2c)'
                    : 'var(--surface-container-low, #f5f5f5)',
                  color: msg.role === 'user' ? '#fff' : 'var(--on-surface, #1c1c1e)',
                  fontSize: '0.84rem', lineHeight: 1.5,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: '85%' }}>
                    {msg.sources.map((s, si) => (
                      <span key={si} style={{
                        fontSize: '0.67rem', padding: '2px 7px', borderRadius: 99,
                        background: 'rgba(13,99,27,0.1)', color: '#0d631b',
                        border: '1px solid rgba(13,99,27,0.2)',
                      }}>
                        📄 {s.heading}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading bubble */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '9px 13px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--surface-container-low, #f5f5f5)',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(d => (
                    <span key={d} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#0d631b', display: 'inline-block',
                      animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested questions (only when only greeting shown) */}
          {messages.length === 1 && (
            <div style={{ padding: '0 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    fontSize: '0.72rem', padding: '5px 10px', borderRadius: 99, cursor: 'pointer',
                    background: 'rgba(13,99,27,0.08)', color: '#0d631b',
                    border: '1px solid rgba(13,99,27,0.2)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,99,27,0.16)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(13,99,27,0.08)')}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid var(--outline-variant, rgba(0,0,0,0.1))',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask me anything…"
              disabled={loading}
              style={{
                flex: 1, border: '1px solid var(--outline-variant, rgba(0,0,0,0.15))',
                borderRadius: 99, padding: '8px 14px', fontSize: '0.84rem',
                background: 'var(--surface-container-low, #f8f8f8)',
                color: 'var(--on-surface, #1c1c1e)', outline: 'none',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              id="chatbot-send-btn"
              style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: input.trim() && !loading ? 'linear-gradient(135deg, #0d631b, #1a8a2c)' : 'var(--outline-variant, #ccc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              <span className="material-symbols-outlined icon-filled" style={{ color: '#fff', fontSize: 18 }}>send</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
