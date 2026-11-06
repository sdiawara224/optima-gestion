import React, { useMemo, useState } from 'react'
import { Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { useStore } from '../store'
import type { Customer } from '../types'
import { saleTotal } from '../types'
import { formatDate, formatMoney, todayISO, uid } from '../lib/format'
import { Badge, ConfirmButton, EmptyState, Field, Modal, useToast } from '../components/ui'

const emptyCustomer = (): Customer => ({
  id: '',
  name: '',
  phone: '',
  email: '',
  city: '',
  notes: '',
  createdAt: todayISO(),
})

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

export const CustomersPage: React.FC = () => {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const currency = db.settings.currency
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Customer | null>(null)
  const [detail, setDetail] = useState<Customer | null>(null)

  const stats = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number; due: number; last: string }>()
    for (const sale of db.sales) {
      if (!sale.customerId) continue
      const entry = map.get(sale.customerId) ?? { revenue: 0, count: 0, due: 0, last: '' }
      const total = saleTotal(sale)
      entry.revenue += total
      entry.count += 1
      entry.due += Math.max(0, total - sale.amountPaid)
      if (sale.date > entry.last) entry.last = sale.date
      map.set(sale.customerId, entry)
    }
    return map
  }, [db.sales])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q))
      .sort((a, b) => (stats.get(b.id)?.revenue ?? 0) - (stats.get(a.id)?.revenue ?? 0))
  }, [db.customers, query, stats])

  const totalRevenue = [...stats.values()].reduce((s, v) => s + v.revenue, 0)
  const totalDue = [...stats.values()].reduce((s, v) => s + v.due, 0)

  const save = (customer: Customer) => {
    dispatch({ type: 'customer/save', customer: { ...customer, id: customer.id || uid('cus') } })
    setEditing(null)
    toast(customer.id ? 'Fiche client mise à jour' : 'Client ajouté')
  }

  const customerSales = detail ? db.sales.filter((s) => s.customerId === detail.id).sort((a, b) => b.date.localeCompare(a.date)) : []

  return (
    <>
      <div className="stat-grid">
        <div className="stat hero">
          <div className="stat-label">Fichier clients</div>
          <div className="stat-value">{db.customers.length}</div>
          <div className="stat-foot">{db.sales.filter((s) => s.customerId).length} ventes rattachées à une fiche</div>
        </div>
        <div className="stat">
          <div className="stat-label">CA clients identifiés</div>
          <div className="stat-value">{formatMoney(totalRevenue, currency)}</div>
          <div className="stat-foot">Cumul historique</div>
        </div>
        <div className="stat">
          <div className="stat-label">Encours à recouvrer</div>
          <div className="stat-value" style={{ color: totalDue > 0 ? 'var(--amber)' : undefined }}>{formatMoney(totalDue, currency)}</div>
          <div className="stat-foot">Factures partiellement ou non payées</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Clients</h3>
            <p className="card-sub">Coordonnées, historique et encours par client</p>
          </div>
          <div className="card-actions">
            <button className="btn btn-mint" onClick={() => setEditing(emptyCustomer())}>
              <UserPlus /> Nouveau client
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <Search />
            <input className="input" placeholder="Nom, téléphone ou ville…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        <div className="table-wrap">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="Aucun client"
              description="Ajoutez vos clients pour suivre leur historique d'achat et leurs encours."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(emptyCustomer())}>
                  <Plus /> Ajouter un client
                </button>
              }
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th>Ville</th>
                  <th className="num">CA total</th>
                  <th className="num">Encours</th>
                  <th>Dernier achat</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const st = stats.get(c.id)
                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setDetail(c)}>
                      <td>
                        <div className="row" style={{ gap: 9 }}>
                          <div className="avatar">{initials(c.name)}</div>
                          <div>
                            <div className="cell-title">{c.name}</div>
                            {st && <div className="cell-sub">{st.count} commande(s)</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="small">{c.phone || '—'}</div>
                        <div className="cell-sub">{c.email || '—'}</div>
                      </td>
                      <td className="small muted">{c.city || '—'}</td>
                      <td className="num strong">{formatMoney(st?.revenue ?? 0, currency)}</td>
                      <td className="num">
                        {(st?.due ?? 0) > 0 ? <Badge tone="amber">{formatMoney(st!.due, currency)}</Badge> : <span className="faint">—</span>}
                      </td>
                      <td className="faint small nowrap">{st?.last ? formatDate(st.last) : '—'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button className="btn-icon" title="Modifier" onClick={() => setEditing(c)}>
                            <Pencil size={16} />
                          </button>
                          <ConfirmButton
                            onConfirm={() => {
                              dispatch({ type: 'customer/delete', id: c.id })
                              toast('Client supprimé')
                            }}
                          >
                            <Trash2 size={16} />
                          </ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <CustomerModal customer={editing} onClose={() => setEditing(null)} onSave={save} />

      <Modal open={!!detail} title={detail?.name ?? ''} subtitle="Fiche client & historique" onClose={() => setDetail(null)} wide>
        {detail && (
          <>
            <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
              <div className="avatar" style={{ width: 48, height: 48, flex: '0 0 48px', fontSize: 16 }}>{initials(detail.name)}</div>
              <div className="stack" style={{ gap: 4 }}>
                <span className="row small"><Phone size={14} /> {detail.phone || '—'}</span>
                <span className="row small"><Mail size={14} /> {detail.email || '—'}</span>
                <span className="row small"><MapPin size={14} /> {detail.city || '—'}</span>
              </div>
              <div className="spacer" />
              <div style={{ textAlign: 'right' }}>
                <div className="faint small">CA cumulé</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>
                  {formatMoney(stats.get(detail.id)?.revenue ?? 0, currency)}
                </div>
              </div>
            </div>

            {detail.notes && <p className="small muted" style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 10 }}>{detail.notes}</p>}

            <div className="table-wrap" style={{ border: '1px solid var(--line)', borderRadius: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Date</th>
                    <th className="num">Total</th>
                    <th className="num">Reste dû</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSales.length === 0 ? (
                    <tr><td colSpan={4} className="faint small" style={{ padding: 18, textAlign: 'center' }}>Aucune vente enregistrée.</td></tr>
                  ) : (
                    customerSales.map((s) => (
                      <tr key={s.id}>
                        <td className="strong mono">{s.reference}</td>
                        <td className="faint">{formatDate(s.date)}</td>
                        <td className="num">{formatMoney(saleTotal(s), currency)}</td>
                        <td className="num">{formatMoney(Math.max(0, saleTotal(s) - s.amountPaid), currency)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

const CustomerModal: React.FC<{
  customer: Customer | null
  onClose: () => void
  onSave: (c: Customer) => void
}> = ({ customer, onClose, onSave }) => {
  const [form, setForm] = useState<Customer | null>(customer)
  React.useEffect(() => setForm(customer), [customer])
  if (!form) return null
  const set = <K extends keyof Customer>(k: K, v: Customer[K]) => setForm({ ...form, [k]: v })

  return (
    <Modal
      open
      title={customer?.id ? 'Modifier le client' : 'Nouveau client'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={!form.name.trim()} onClick={() => onSave(form)}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nom / raison sociale" span2>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. Restaurant Le Baobab" />
        </Field>
        <Field label="Téléphone">
          <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+224 …" />
        </Field>
        <Field label="E-mail">
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Ville / quartier" span2>
          <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="Notes" span2>
          <textarea className="textarea" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Habitudes d'achat, conditions de paiement…" />
        </Field>
      </div>
    </Modal>
  )
}
