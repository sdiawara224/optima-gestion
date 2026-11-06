import React, { useMemo, useState } from 'react'
import { Banknote, Eye, Plus, Printer, Receipt, Search, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import type { Customer, PaymentMethod, Sale, SaleLine } from '../types'
import { saleStatus, saleTotal } from '../types'
import { formatDate, formatDateLong, formatMoney, todayISO, uid } from '../lib/format'
import { Badge, ConfirmButton, EmptyState, Field, Modal, useToast } from '../components/ui'

const METHODS: PaymentMethod[] = ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Virement']

interface DraftLine {
  key: string
  productId: string
  quantity: number
  unitPrice: number
}

const emptyDraft = () => ({
  customerId: '',
  date: todayISO(),
  paymentMethod: 'Espèces' as PaymentMethod,
  discount: 0,
  note: '',
  lines: [{ key: uid('ln'), productId: '', quantity: 1, unitPrice: 0 }] as DraftLine[],
})

export const SalesPage: React.FC = () => {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const currency = db.settings.currency

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'toutes' | 'payée' | 'partielle' | 'impayée'>('toutes')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Sale | null>(null)
  const [paying, setPaying] = useState<Sale | null>(null)

  const sales = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...db.sales]
      .filter((s) => (statusFilter === 'toutes' ? true : saleStatus(s) === statusFilter))
      .filter((s) => !q || s.reference.toLowerCase().includes(q) || s.customerName.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date) || b.reference.localeCompare(a.reference))
  }, [db.sales, query, statusFilter])

  const totalFiltered = sales.reduce((s, x) => s + saleTotal(x), 0)
  const unpaid = db.sales.reduce((s, x) => s + Math.max(0, saleTotal(x) - x.amountPaid), 0)

  return (
    <>
      <div className="stat-grid">
        <div className="stat hero">
          <div className="stat-label">Ventes affichées</div>
          <div className="stat-value">{formatMoney(totalFiltered, currency)}</div>
          <div className="stat-foot">{sales.length} facture(s) sur {db.sales.length}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Encaissé</div>
          <div className="stat-value">{formatMoney(totalFiltered - sales.reduce((s, x) => s + Math.max(0, saleTotal(x) - x.amountPaid), 0), currency)}</div>
          <div className="stat-foot">Sur la sélection</div>
        </div>
        <div className="stat">
          <div className="stat-label">Reste à encaisser</div>
          <div className="stat-value" style={{ color: unpaid > 0 ? 'var(--amber)' : undefined }}>{formatMoney(unpaid, currency)}</div>
          <div className="stat-foot">Toutes ventes confondues</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Ventes & factures</h3>
            <p className="card-sub">Le stock est déduit automatiquement à chaque vente</p>
          </div>
          <div className="card-actions">
            <button className="btn btn-mint" onClick={() => setCreating(true)}>
              <Plus /> Nouvelle vente
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <Search />
            <input
              className="input"
              placeholder="Référence ou client…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="seg">
            {(['toutes', 'payée', 'partielle', 'impayée'] as const).map((s) => (
              <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
                {s === 'toutes' ? 'Toutes' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          {sales.length === 0 ? (
            <EmptyState
              icon={<Receipt />}
              title="Aucune vente"
              description="Créez votre première vente pour alimenter votre tableau de bord et votre stock."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
                  <Plus /> Enregistrer une vente
                </button>
              }
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th className="num">Total</th>
                  <th className="num">Encaissé</th>
                  <th>Paiement</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const total = saleTotal(s)
                  const status = saleStatus(s)
                  return (
                    <tr key={s.id}>
                      <td className="strong mono">{s.reference}</td>
                      <td>
                        <div className="cell-title">{s.customerName}</div>
                        <div className="cell-sub">{s.lines.length} article(s)</div>
                      </td>
                      <td className="faint nowrap">{formatDate(s.date)}</td>
                      <td className="num strong">{formatMoney(total, currency)}</td>
                      <td className="num">{formatMoney(s.amountPaid, currency)}</td>
                      <td><span className="small muted">{s.paymentMethod}</span></td>
                      <td>
                        <Badge tone={status === 'payée' ? 'green' : status === 'partielle' ? 'amber' : 'red'}>{status}</Badge>
                      </td>
                      <td>
                        <div className="row-actions">
                          {status !== 'payée' && (
                            <button className="btn-icon" title="Encaisser un paiement" onClick={() => setPaying(s)}>
                              <Banknote size={16} />
                            </button>
                          )}
                          <button className="btn-icon" title="Voir la facture" onClick={() => setViewing(s)}>
                            <Eye size={16} />
                          </button>
                          <ConfirmButton
                            onConfirm={() => {
                              dispatch({ type: 'sale/delete', id: s.id })
                              toast('Vente annulée, stock restauré')
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

      <SaleBuilder
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(sale) => {
          dispatch({ type: 'sale/create', sale })
          setCreating(false)
          toast(`Vente ${sale.reference} enregistrée`)
        }}
      />

      <SaleReceipt sale={viewing} onClose={() => setViewing(null)} />

      <PaymentModal sale={paying} onClose={() => setPaying(null)} />
    </>
  )
}

/* ------------------------------------------------------------- builder */

const SaleBuilder: React.FC<{ open: boolean; onClose: () => void; onSave: (s: Sale) => void }> = ({
  open,
  onClose,
  onSave,
}) => {
  const { db } = useStore()
  const currency = db.settings.currency
  const [draft, setDraft] = useState(emptyDraft())
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) {
      setDraft(emptyDraft())
      setError('')
    }
  }, [open])

  const productById = (id: string) => db.products.find((p) => p.id === id)

  const lines: SaleLine[] = draft.lines
    .filter((l) => l.productId)
    .map((l) => {
      const p = productById(l.productId)!
      return { productId: p.id, name: p.name, quantity: l.quantity, unitPrice: l.unitPrice, purchasePrice: p.purchasePrice }
    })

  const gross = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const total = Math.max(0, gross - draft.discount)

  const setLine = (key: string, patch: Partial<DraftLine>) => {
    setDraft((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }))
  }

  const addLine = () =>
    setDraft((d) => ({ ...d, lines: [...d.lines, { key: uid('ln'), productId: '', quantity: 1, unitPrice: 0 }] }))

  const removeLine = (key: string) =>
    setDraft((d) => ({
      ...d,
      lines: d.lines.length > 1 ? d.lines.filter((l) => l.key !== key) : d.lines,
    }))

  const submit = () => {
    if (lines.length === 0) {
      setError('Ajoutez au moins un produit à la vente.')
      return
    }
    const overStock = lines.find((l) => {
      const p = productById(l.productId)
      return p && l.quantity > p.stock
    })
    if (overStock) {
      setError(`Stock insuffisant pour « ${overStock.name} ».`)
      return
    }
    const customer = db.customers.find((c) => c.id === draft.customerId) ?? null
    const sale: Sale = {
      id: uid('sal'),
      reference: `FA-${1050 + db.sales.length + Math.floor(Math.random() * 40)}`,
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : 'Client de passage',
      date: draft.date,
      lines,
      discount: draft.discount,
      amountPaid: total,
      paymentMethod: draft.paymentMethod,
      note: draft.note,
    }
    onSave(sale)
  }

  return (
    <Modal
      open={open}
      wide
      title="Nouvelle vente"
      subtitle="Sélectionnez les produits : le stock et le total se calculent en direct"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-mint" onClick={submit}>Encaisser {formatMoney(total, currency)}</button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Client">
          <select
            className="select"
            value={draft.customerId}
            onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
          >
            <option value="">Client de passage</option>
            {db.customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </Field>
      </div>

      <div>
        <div className="row" style={{ marginBottom: 8 }}>
          <strong className="small">Articles</strong>
          <span className="spacer" />
          <button className="btn btn-outline btn-sm" onClick={addLine}>
            <Plus size={14} /> Ajouter une ligne
          </button>
        </div>

        <div className="builder-lines">
          {draft.lines.map((l) => {
            const p = productById(l.productId)
            const lineTotal = l.quantity * l.unitPrice
            return (
              <div className="builder-line" key={l.key}>
                <select
                  className="select"
                  value={l.productId}
                  onChange={(e) => {
                    const prod = productById(e.target.value)
                    setLine(l.key, { productId: e.target.value, unitPrice: prod ? prod.salePrice : 0 })
                  }}
                >
                  <option value="">Choisir un produit…</option>
                  {db.products.map((prod) => (
                    <option key={prod.id} value={prod.id} disabled={prod.stock === 0}>
                      {prod.name} {prod.stock === 0 ? '(rupture)' : `· ${prod.stock} ${prod.unit}`}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={l.quantity}
                  onChange={(e) => setLine(l.key, { quantity: Math.max(1, Number(e.target.value)) })}
                  title="Quantité"
                />
                <input
                  className="input line-price"
                  type="number"
                  min={0}
                  value={l.unitPrice}
                  onChange={(e) => setLine(l.key, { unitPrice: Number(e.target.value) })}
                  title="Prix unitaire"
                />
                <div className="row" style={{ gap: 4 }}>
                  <span className="line-total" style={{ display: 'none' }}>{lineTotal}</span>
                  <button className="btn-icon" onClick={() => removeLine(l.key)} title="Retirer">
                    <Trash2 size={15} />
                  </button>
                </div>
                {p && l.quantity > p.stock && (
                  <div className="stock-pill" style={{ gridColumn: '1 / -1', color: 'var(--red)' }}>
                    Stock insuffisant : {p.stock} {p.unit} disponible(s).
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="hint faint" style={{ fontSize: 11.8, marginTop: 6 }}>
          Colonnes : produit · quantité · prix unitaire ({currency})
        </p>
      </div>

      <div className="form-grid">
        <Field label={`Remise (${currency})`}>
          <input
            className="input"
            type="number"
            min={0}
            value={draft.discount}
            onChange={(e) => setDraft({ ...draft, discount: Math.max(0, Number(e.target.value)) })}
          />
        </Field>
        <Field label="Moyen de paiement">
          <select
            className="select"
            value={draft.paymentMethod}
            onChange={(e) => setDraft({ ...draft, paymentMethod: e.target.value as PaymentMethod })}
          >
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Note (optionnel)" span2>
          <input className="input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Ex. livraison samedi matin" />
        </Field>
      </div>

      <div className="builder-summary">
        <div className="summary-row"><span>Sous-total</span><strong>{formatMoney(gross, currency)}</strong></div>
        <div className="summary-row"><span>Remise</span><strong>− {formatMoney(draft.discount, currency)}</strong></div>
        <div className="summary-row total"><span>Total à encaisser</span><strong>{formatMoney(total, currency)}</strong></div>
      </div>

      {error && <p className="small" style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</p>}
    </Modal>
  )
}

/* -------------------------------------------------------------- receipt */

export const SaleReceipt: React.FC<{ sale: Sale | null; onClose: () => void }> = ({ sale, onClose }) => {
  const { db } = useStore()
  const currency = db.settings.currency
  const s = db.settings
  if (!sale) return null
  const total = saleTotal(sale)
  const status = saleStatus(sale)
  const customer: Customer | undefined = db.customers.find((c) => c.id === sale.customerId)

  return (
    <Modal
      open
      wide
      title={`Facture ${sale.reference}`}
      subtitle={formatDateLong(sale.date)}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer /> Imprimer / PDF
          </button>
        </>
      }
    >
      <div className="doc-sheet">
        <div className="doc-top">
          <div>
            <div className="doc-brand">{s.businessName}</div>
            <div className="doc-muted">{s.address}</div>
            <div className="doc-muted">{s.phone}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="doc-badge" style={{ marginLeft: 'auto' }}>Facture {sale.reference}</div>
            <div className="doc-muted" style={{ marginTop: 8 }}>{formatDateLong(sale.date)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
          <div>
            <div className="doc-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5 }}>Client</div>
            <div style={{ fontWeight: 600 }}>{sale.customerName}</div>
            {customer?.phone && <div className="doc-muted">{customer.phone}</div>}
            {customer?.city && <div className="doc-muted">{customer.city}</div>}
          </div>
          <div>
            <div className="doc-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10.5 }}>Paiement</div>
            <div style={{ fontWeight: 600 }}>{sale.paymentMethod}</div>
            <div className="doc-muted">Statut : {status}</div>
          </div>
        </div>

        <table className="doc-lines">
          <thead>
            <tr>
              <th>Désignation</th>
              <th className="num">Qté</th>
              <th className="num">P.U.</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.name}</td>
                <td className="num mono">{l.quantity}</td>
                <td className="num mono">{formatMoney(l.unitPrice, currency)}</td>
                <td className="num mono">{formatMoney(l.quantity * l.unitPrice, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-totals">
          <div className="summary-row">
            <span>Sous-total</span>
            <strong>{formatMoney(total + sale.discount, currency)}</strong>
          </div>
          {sale.discount > 0 && (
            <div className="summary-row">
              <span>Remise</span>
              <strong>− {formatMoney(sale.discount, currency)}</strong>
            </div>
          )}
          <div className="summary-row total">
            <span>Total</span>
            <strong>{formatMoney(total, currency)}</strong>
          </div>
          <div className="summary-row">
            <span>Encaissé</span>
            <strong>{formatMoney(sale.amountPaid, currency)}</strong>
          </div>
          {total - sale.amountPaid > 0.5 && (
            <div className="summary-row" style={{ color: 'var(--red)' }}>
              <span>Reste dû</span>
              <strong>{formatMoney(total - sale.amountPaid, currency)}</strong>
            </div>
          )}
        </div>

        {sale.note && <p className="doc-muted" style={{ marginTop: 20 }}>Note : {sale.note}</p>}
        <p className="doc-muted" style={{ marginTop: 22, textAlign: 'center', fontSize: 11 }}>
          Merci de votre confiance — {s.businessName} · Document généré par Optima Gestion
        </p>
      </div>
    </Modal>
  )
}

/* -------------------------------------------------------------- payment */

const PaymentModal: React.FC<{ sale: Sale | null; onClose: () => void }> = ({ sale, onClose }) => {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const currency = db.settings.currency
  const due = sale ? Math.max(0, saleTotal(sale) - sale.amountPaid) : 0
  const [amount, setAmount] = useState(due)

  React.useEffect(() => setAmount(due), [due, sale?.id])

  if (!sale) return null

  return (
    <Modal
      open
      title="Encaisser un paiement"
      subtitle={`${sale.reference} · reste dû ${formatMoney(due, currency)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              dispatch({ type: 'sale/payment', id: sale.id, amount })
              toast('Paiement enregistré')
              onClose()
            }}
          >
            Enregistrer
          </button>
        </>
      }
    >
      <Field label={`Montant reçu (${currency})`}>
        <input className="input" type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </Field>
      <div className="row" style={{ gap: 8 }}>
        <button className="chip" onClick={() => setAmount(due)}>Solde total</button>
        <button className="chip" onClick={() => setAmount(Math.round(due / 2))}>50 %</button>
        <button className="chip" onClick={() => setAmount(0)}>0</button>
      </div>
      <p className="small muted">
        Nouveau reste dû : <strong>{formatMoney(Math.max(0, due - amount), currency)}</strong>
      </p>
    </Modal>
  )
}

