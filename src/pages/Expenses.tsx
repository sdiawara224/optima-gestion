import React, { useMemo, useState } from 'react'
import { Pencil, Plus, Receipt, Search, Trash2, Wallet } from 'lucide-react'
import { useStore } from '../store'
import type { Expense, PaymentMethod } from '../types'
import { formatDate, formatMoney, monthKey, monthLabel, todayISO, uid } from '../lib/format'
import { Badge, ConfirmButton, EmptyState, Field, Modal, ProgressBar, useToast } from '../components/ui'

const METHODS: PaymentMethod[] = ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Moov Money', 'Virement']
const CATEGORIES = ['Loyer', 'Salaires', 'Achat stock', 'Énergie', 'Transport', 'Marketing', 'Fournitures', 'Impôts & taxes', 'Autre']

const emptyExpense = (): Expense => ({
  id: '',
  label: '',
  category: 'Loyer',
  amount: 0,
  date: todayISO(),
  paymentMethod: 'Espèces',
})

export const ExpensesPage: React.FC = () => {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const currency = db.settings.currency
  const [query, setQuery] = useState('')
  const [month, setMonth] = useState(monthKey(todayISO()))
  const [editing, setEditing] = useState<Expense | null>(null)

  const months = useMemo(() => {
    const set = new Set(db.expenses.map((e) => monthKey(e.date)))
    set.add(monthKey(todayISO()))
    return [...set].sort().reverse()
  }, [db.expenses])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.expenses
      .filter((e) => monthKey(e.date) === month)
      .filter((e) => !q || e.label.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [db.expenses, month, query])

  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  const save = (expense: Expense) => {
    dispatch({ type: 'expense/save', expense: { ...expense, id: expense.id || uid('exp') } })
    setEditing(null)
    toast(expense.id ? 'Dépense modifiée' : 'Dépense enregistrée')
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat hero">
          <div className="stat-label">Charges du mois</div>
          <div className="stat-value">{formatMoney(total, currency)}</div>
          <div className="stat-foot">{filtered.length} écriture(s) · {monthLabel(month)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Poste le plus lourd</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{byCategory[0]?.[0] ?? '—'}</div>
          <div className="stat-foot">{byCategory[0] ? formatMoney(byCategory[0][1], currency) : 'Aucune dépense'}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Dépense moyenne</div>
          <div className="stat-value">{formatMoney(filtered.length ? total / filtered.length : 0, currency)}</div>
          <div className="stat-foot">Par écriture sur le mois</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Journal des dépenses</h3>
              <p className="card-sub">Loyer, salaires, achats, transport, marketing…</p>
            </div>
            <div className="card-actions">
              <button className="btn btn-mint" onClick={() => setEditing(emptyExpense())}>
                <Plus /> Nouvelle dépense
              </button>
            </div>
          </div>

          <div className="toolbar">
            <div className="search">
              <Search />
              <input className="input" placeholder="Libellé ou catégorie…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="select" style={{ width: 170 }} value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>

          <div className="table-wrap">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Wallet />}
                title="Aucune dépense ce mois"
                description="Enregistrez vos charges pour obtenir un bénéfice net fiable dans le tableau de bord."
                action={
                  <button className="btn btn-primary btn-sm" onClick={() => setEditing(emptyExpense())}>
                    <Plus /> Ajouter une dépense
                  </button>
                }
              />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Libellé</th>
                    <th>Catégorie</th>
                    <th>Date</th>
                    <th className="num">Montant</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <div className="cell-title">{e.label}</div>
                        <div className="cell-sub">{e.paymentMethod}</div>
                      </td>
                      <td><Badge plain>{e.category}</Badge></td>
                      <td className="faint nowrap">{formatDate(e.date)}</td>
                      <td className="num strong">{formatMoney(e.amount, currency)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn-icon" onClick={() => setEditing(e)} title="Modifier">
                            <Pencil size={16} />
                          </button>
                          <ConfirmButton
                            onConfirm={() => {
                              dispatch({ type: 'expense/delete', id: e.id })
                              toast('Dépense supprimée')
                            }}
                          >
                            <Trash2 size={16} />
                          </ConfirmButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Répartition par poste</h3>
              <p className="card-sub">{monthLabel(month)}</p>
            </div>
          </div>
          <div className="card-body">
            {byCategory.length === 0 ? (
              <EmptyState icon={<Receipt />} title="Rien à afficher" description="Aucune charge enregistrée sur la période." />
            ) : (
              <div className="stack" style={{ gap: 13 }}>
                {byCategory.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{cat}</span>
                      <span className="small faint tabular">{formatMoney(amount, currency)} · {Math.round((amount / total) * 100)} %</span>
                    </div>
                    <ProgressBar value={(amount / total) * 100} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ExpenseModal expense={editing} onClose={() => setEditing(null)} onSave={save} currency={currency} />
    </>
  )
}

const ExpenseModal: React.FC<{
  expense: Expense | null
  currency: string
  onClose: () => void
  onSave: (e: Expense) => void
}> = ({ expense, currency, onClose, onSave }) => {
  const [form, setForm] = useState<Expense | null>(expense)
  React.useEffect(() => setForm(expense), [expense])
  if (!form) return null
  const set = <K extends keyof Expense>(k: K, v: Expense[K]) => setForm({ ...form, [k]: v })

  return (
    <Modal
      open
      title={expense?.id ? 'Modifier la dépense' : 'Nouvelle dépense'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={!form.label.trim() || form.amount <= 0} onClick={() => onSave(form)}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Libellé" span2>
          <input className="input" value={form.label} onChange={(e) => set('label', e.target.value)} placeholder="Ex. Loyer boutique" />
        </Field>
        <Field label="Catégorie">
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={`Montant (${currency})`}>
          <input className="input" type="number" min={0} value={form.amount} onChange={(e) => set('amount', Number(e.target.value))} />
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Moyen de paiement">
          <select className="select" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  )
}
