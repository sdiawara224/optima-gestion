import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, X } from 'lucide-react'

/* ------------------------------------------------------------------ modal */

interface ModalProps {
  open: boolean
  title: string
  subtitle?: string
  wide?: boolean
  onClose: () => void
  footer?: React.ReactNode
  children: React.ReactNode
}

export const Modal: React.FC<ModalProps> = ({ open, title, subtitle, wide, onClose, footer, children }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/* ------------------------------------------------------------------ toast */

interface ToastItem { id: number; message: string }
const ToastContext = createContext<(msg: string) => void>(() => {})
export const useToast = () => useContext(ToastContext)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      {items.length > 0 &&
        createPortal(
          <div className="toast-wrap">
            {items.map((t) => (
              <div className="toast" key={t.id}>
                <Check /> {t.message}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

/* ------------------------------------------------------------- primitives */

export const Badge: React.FC<{
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'gray'
  plain?: boolean
  children: React.ReactNode
}> = ({ tone = 'gray', plain, children }) => (
  <span className={`badge ${tone} ${plain ? 'plain' : ''}`}>{children}</span>
)

export const EmptyState: React.FC<{
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}> = ({ icon, title, description, action }) => (
  <div className="empty">
    <div className="empty-icon">{icon}</div>
    <div className="empty-title">{title}</div>
    {description && <p className="empty-desc">{description}</p>}
    {action && <div style={{ marginTop: 10 }}>{action}</div>}
  </div>
)

export const Field: React.FC<{
  label: string
  hint?: string
  span2?: boolean
  children: React.ReactNode
}> = ({ label, hint, span2, children }) => (
  <div className={`field ${span2 ? 'span-2' : ''}`}>
    <label>{label}</label>
    {children}
    {hint && <span className="hint">{hint}</span>}
  </div>
)

export const ProgressBar: React.FC<{ value: number; tone?: 'green' | 'amber' | 'red' }> = ({
  value,
  tone = 'green',
}) => (
  <div className={`progress ${tone === 'green' ? '' : tone}`}>
    <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
)

export const ConfirmButton: React.FC<{
  onConfirm: () => void
  label?: string
  children: React.ReactNode
}> = ({ onConfirm, label = 'Supprimer', children }) => {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 3000)
    return () => window.clearTimeout(t)
  }, [armed])
  if (armed)
    return (
      <button
        className="btn btn-danger btn-sm"
        onClick={() => {
          onConfirm()
          setArmed(false)
        }}
      >
        {label} ?
      </button>
    )
  return (
    <button className="btn btn-sm btn-ghost" style={{ color: 'var(--red)' }} onClick={() => setArmed(true)}>
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------- chart */

export const BarChart: React.FC<{
  data: { label: string; value: number; hint?: string }[]
  format?: (v: number) => string
}> = ({ data, format = String }) => {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-col" key={`${d.label}-${i}`} title={`${d.label} — ${format(d.value)}`}>
          <span className="bar-value">{d.value > 0 ? format(d.value) : ''}</span>
          <div className="bar-track">
            <div
              className={`bar-fill ${d.value === 0 ? 'muted' : ''}`}
              style={{ height: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
