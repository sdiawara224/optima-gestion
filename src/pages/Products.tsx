import React, { useMemo, useState } from 'react'
import { Boxes, PackagePlus, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import type { Product } from '../types'
import { formatMoney, todayISO, uid } from '../lib/format'
import { Badge, ConfirmButton, EmptyState, Field, Modal, ProgressBar, useToast } from '../components/ui'

const emptyProduct = (): Product => ({
  id: '',
  sku: '',
  name: '',
  category: 'Alimentation',
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 5,
  unit: 'pièce',
  createdAt: todayISO(),
})

const CATEGORIES = ['Alimentation', 'Boissons', 'Hygiène', 'Textile', 'Électronique', 'Fournitures', 'Autre']
const UNITS = ['pièce', 'kg', 'sac', 'bidon', 'paquet', 'carton', 'pack', 'litre', 'flacon']

export const ProductsPage: React.FC = () => {
  const { db, dispatch } = useStore()
  const toast = useToast()
  const currency = db.settings.currency

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Toutes')
  const [onlyLow, setOnlyLow] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [adjust, setAdjust] = useState<Product | null>(null)
  const [adjustQty, setAdjustQty] = useState(1)

  const categories = useMemo(
    () => ['Toutes', ...Array.from(new Set(db.products.map((p) => p.category))).sort()],
    [db.products],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.products
      .filter((p) => (category === 'Toutes' ? true : p.category === category))
      .filter((p) => (onlyLow ? p.stock <= p.minStock : true))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.products, query, category, onlyLow])

  const stockValue = filtered.reduce((s, p) => s + p.stock * p.purchasePrice, 0)
  const lowCount = db.products.filter((p) => p.stock <= p.minStock).length

  const save = (product: Product) => {
    const isNew = !product.id
    dispatch({ type: 'product/save', product: { ...product, id: product.id || uid('prd') } })
    setEditing(null)
    toast(isNew ? 'Produit ajouté au catalogue' : 'Produit mis à jour')
  }

  const applyAdjust = () => {
    if (!adjust) return
    dispatch({ type: 'product/adjustStock', id: adjust.id, delta: adjustQty })
    setAdjust(null)
    setAdjustQty(1)
    toast('Stock ajusté')
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat hero">
          <div className="stat-label">Produits suivis</div>
          <div className="stat-value">{db.products.length}</div>
          <div className="stat-foot">{filtered.length} affiché(s) avec les filtres actifs</div>
        </div>
        <div className="stat">
          <div className="stat-label">Valeur d'achat du stock</div>
          <div className="stat-value">{formatMoney(stockValue, currency)}</div>
          <div className="stat-foot">Sur la sélection affichée</div>
        </div>
        <div className="stat">
          <div className="stat-label">Valeur de revente</div>
          <div className="stat-value">
            {formatMoney(filtered.reduce((s, p) => s + p.stock * p.salePrice, 0), currency)}
          </div>
          <div className="stat-foot">Potentiel brut si tout est vendu</div>
        </div>
        <div className="stat">
          <div className="stat-label">À réapprovisionner</div>
          <div className="stat-value" style={{ color: lowCount ? 'var(--amber)' : undefined }}>{lowCount}</div>
          <div className="stat-foot">Produits sous le seuil d'alerte</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Catalogue & inventaire</h3>
            <p className="card-sub">Prix d'achat, prix de vente, quantités et seuils d'alerte</p>
          </div>
          <div className="card-actions">
            <button className="btn btn-mint" onClick={() => setEditing(emptyProduct())}>
              <Plus /> Nouveau produit
            </button>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <Search />
            <input
              className="input"
              placeholder="Rechercher un produit ou un SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {categories.slice(0, 6).map((c) => (
              <button key={c} className={`chip ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
          <button
            className={`chip ${onlyLow ? 'active' : ''}`}
            onClick={() => setOnlyLow((v) => !v)}
            style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
          >
            <SlidersHorizontal size={12} /> Stock faible
          </button>
        </div>

        <div className="table-wrap">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Boxes />}
              title="Aucun produit trouvé"
              description="Ajustez votre recherche ou ajoutez un nouveau produit à votre catalogue."
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(emptyProduct())}>
                  <Plus /> Ajouter un produit
                </button>
              }
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Catégorie</th>
                  <th className="num">Achat</th>
                  <th className="num">Vente</th>
                  <th className="num">Marge</th>
                  <th>Stock</th>
                  <th className="num">Valeur</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const margin = p.salePrice - p.purchasePrice
                  const pct = p.purchasePrice > 0 ? (margin / p.purchasePrice) * 100 : 0
                  const ratio = (p.stock / Math.max(1, p.minStock * 2)) * 100
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="cell-title">{p.name}</div>
                        <div className="cell-sub mono">{p.sku || '—'} · {p.unit}</div>
                      </td>
                      <td><Badge plain>{p.category}</Badge></td>
                      <td className="num">{formatMoney(p.purchasePrice, currency)}</td>
                      <td className="num strong">{formatMoney(p.salePrice, currency)}</td>
                      <td className="num">
                        <span style={{ color: margin > 0 ? '#15803d' : 'var(--red)', fontWeight: 600 }}>
                          {pct.toFixed(0)} %
                        </span>
                      </td>
                      <td>
                        <div style={{ minWidth: 108 }}>
                          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                            <span className="small" style={{ fontWeight: 600 }}>{p.stock} {p.unit}</span>
                            {p.stock <= p.minStock && (
                              <Badge tone={p.stock === 0 ? 'red' : 'amber'} plain>
                                {p.stock === 0 ? 'rupture' : 'faible'}
                              </Badge>
                            )}
                          </div>
                          <ProgressBar value={ratio} tone={p.stock <= p.minStock ? (p.stock === 0 ? 'red' : 'amber') : 'green'} />
                        </div>
                      </td>
                      <td className="num faint">{formatMoney(p.stock * p.purchasePrice, currency)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn-icon" title="Mouvement de stock" onClick={() => { setAdjust(p); setAdjustQty(1) }}>
                            <PackagePlus size={16} />
                          </button>
                          <button className="btn-icon" title="Modifier" onClick={() => setEditing(p)}>
                            <Pencil size={16} />
                          </button>
                          <ConfirmButton
                            onConfirm={() => {
                              dispatch({ type: 'product/delete', id: p.id })
                              toast('Produit supprimé')
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

      <ProductModal product={editing} onClose={() => setEditing(null)} onSave={save} currency={currency} />

      <Modal
        open={!!adjust}
        title="Mouvement de stock"
        subtitle={adjust ? `${adjust.name} — stock actuel : ${adjust.stock} ${adjust.unit}` : ''}
        onClose={() => setAdjust(null)}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setAdjust(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={applyAdjust}>Enregistrer</button>
          </>
        }
      >
        <Field label="Quantité (négatif pour une sortie)">
          <input
            className="input"
            type="number"
            value={adjustQty}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
          />
        </Field>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {[1, 5, 10, 25, -1, -5].map((q) => (
            <button key={q} className="chip" onClick={() => setAdjustQty(q)}>
              {q > 0 ? `+${q}` : q}
            </button>
          ))}
        </div>
        {adjust && (
          <p className="small muted">
            Nouveau stock après validation :{' '}
            <strong>{Math.max(0, adjust.stock + adjustQty)} {adjust.unit}</strong>
          </p>
        )}
      </Modal>
    </>
  )
}

const ProductModal: React.FC<{
  product: Product | null
  currency: string
  onClose: () => void
  onSave: (p: Product) => void
}> = ({ product, currency, onClose, onSave }) => {
  const [form, setForm] = useState<Product | null>(product)

  React.useEffect(() => {
    setForm(product)
  }, [product])

  if (!form) return null
  const set = <K extends keyof Product>(key: K, value: Product[K]) => setForm({ ...form, [key]: value })
  const margin = form.salePrice - form.purchasePrice
  const pct = form.purchasePrice > 0 ? (margin / form.purchasePrice) * 100 : 0
  const valid = form.name.trim().length > 0 && form.salePrice >= 0

  return (
    <Modal
      open
      title={product?.id ? 'Modifier le produit' : 'Nouveau produit'}
      subtitle="Les marges et alertes se mettent à jour automatiquement"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(form)}>
            {product?.id ? 'Enregistrer' : 'Ajouter au catalogue'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nom du produit" span2>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. Riz parfumé 25 kg" />
        </Field>
        <Field label="Référence / SKU">
          <input className="input" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="RZ-001" />
        </Field>
        <Field label="Catégorie">
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={`Prix d'achat (${currency})`}>
          <input className="input" type="number" min={0} value={form.purchasePrice} onChange={(e) => set('purchasePrice', Number(e.target.value))} />
        </Field>
        <Field label={`Prix de vente (${currency})`}>
          <input className="input" type="number" min={0} value={form.salePrice} onChange={(e) => set('salePrice', Number(e.target.value))} />
        </Field>
        <Field label="Stock actuel">
          <input className="input" type="number" min={0} value={form.stock} onChange={(e) => set('stock', Number(e.target.value))} />
        </Field>
        <Field label="Seuil d'alerte">
          <input className="input" type="number" min={0} value={form.minStock} onChange={(e) => set('minStock', Number(e.target.value))} />
        </Field>
        <Field label="Unité de vente">
          <select className="select" value={form.unit} onChange={(e) => set('unit', e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </Field>
        <div className="field">
          <label>Marge unitaire</label>
          <div className="row" style={{ height: 38 }}>
            <strong style={{ color: margin > 0 ? '#15803d' : 'var(--red)' }}>
              {formatMoney(margin, currency)}
            </strong>
            <span className="faint small">({pct.toFixed(0)} %)</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
