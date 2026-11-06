import React from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Plus,
  ReceiptText,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { useStore } from '../store'
import { formatCompact, formatDate, formatMoney, monthKey, monthLabel, todayISO } from '../lib/format'
import { categoryBreakdown, computeKpis, dailySeries, lastMonths, monthSales, topCustomers, topProducts } from '../lib/stats'
import { saleTotal } from '../types'
import { Badge, BarChart, EmptyState, ProgressBar } from '../components/ui'
import type { Page } from '../App'

const Delta: React.FC<{ value: number }> = ({ value }) => {
  if (!Number.isFinite(value) || value === 0)
    return <span className="delta" style={{ color: 'var(--ink-faint)' }}>stable</span>
  const up = value > 0
  return (
    <span className={`delta ${up ? 'up' : 'down'}`}>
      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
      {Math.abs(value).toFixed(1).replace('.', ',')} %
    </span>
  )
}

export const DashboardPage: React.FC<{ go: (p: Page) => void }> = ({ go }) => {
  const { db } = useStore()
  const currency = db.settings.currency
  const currentKey = monthKey(todayISO())

  const kpis = computeKpis(db, currentKey)
  const prevDate = new Date()
  prevDate.setMonth(prevDate.getMonth() - 1)
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const prev = computeKpis(db, prevKey)

  const growth = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0)

  const months = lastMonths(6)
  const chartData = months.map((key) => {
    const revenue = monthSales(db, key).reduce((s, sale) => s + saleTotal(sale), 0)
    return { label: monthLabel(key), value: Math.round(revenue) }
  })

  const series = dailySeries(db, 14)
  const recentSales = [...db.sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
  const best = topProducts(db, 4)
  const clients = topCustomers(db, 4)
  const categories = categoryBreakdown(db)
  const totalCategory = categories.reduce((s, c) => s + c.value, 0) || 1

  return (
    <>
      <div className="stat-grid">
        <div className="stat hero">
          <div className="stat-label">
            <span className="stat-icon">
              <CircleDollarSign />
            </span>
            Chiffre d'affaires du mois
          </div>
          <div className="stat-value">{formatMoney(kpis.revenue, currency)}</div>
          <div className="stat-foot">
            <Delta value={growth(kpis.revenue, prev.revenue)} /> vs {monthLabel(prevKey)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">
            <span className="stat-icon">
              <TrendingUp />
            </span>
            Bénéfice net
          </div>
          <div className="stat-value" style={{ color: kpis.netProfit >= 0 ? '#15803d' : 'var(--red)' }}>
            {formatMoney(kpis.netProfit, currency)}
          </div>
          <div className="stat-foot">
            Marge brute {kpis.marginRate.toFixed(1).replace('.', ',')} % · charges {formatMoney(kpis.expenses, currency)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">
            <span className="stat-icon">
              <Boxes />
            </span>
            Valeur du stock
          </div>
          <div className="stat-value">{formatMoney(kpis.stockValue, currency)}</div>
          <div className="stat-foot">
            {kpis.lowStock.length > 0 ? (
              <span style={{ color: 'var(--amber)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <TriangleAlert size={13} /> {kpis.lowStock.length} produit(s) à réapprovisionner
              </span>
            ) : (
              'Tous les niveaux de stock sont bons'
            )}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">
            <span className="stat-icon">
              <Wallet />
            </span>
            Créances clients
          </div>
          <div className="stat-value">{formatMoney(kpis.receivable, currency)}</div>
          <div className="stat-foot">
            {kpis.salesCount} vente(s) ce mois · panier moyen {formatMoney(kpis.averageBasket, currency)}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Évolution du chiffre d'affaires</h3>
              <p className="card-sub">6 derniers mois · toutes ventes confondues</p>
            </div>
            <div className="card-actions">
              <div className="legend">
                <span>
                  <i className="dot" style={{ background: '#16a34a' }} /> CA encaissé
                </span>
              </div>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={chartData} format={formatCompact} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Alertes de stock</h3>
              <p className="card-sub">Produits au niveau ou sous le seuil</p>
            </div>
            <div className="card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => go('products')}>
                Gérer
              </button>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 4 }}>
            {kpis.lowStock.length === 0 ? (
              <EmptyState icon={<Boxes />} title="Aucune alerte" description="Votre stock est sain sur tous les produits suivis." />
            ) : (
              <div className="list">
                {kpis.lowStock.slice(0, 5).map((p) => (
                  <div className="list-item" key={p.id}>
                    <div className="avatar" style={{ background: 'var(--amber-soft)', color: 'var(--amber)' }}>
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="list-main">
                      <div className="list-title">{p.name}</div>
                      <div className="list-sub">
                        Seuil {p.minStock} {p.unit} · {p.sku}
                      </div>
                    </div>
                    <div style={{ width: 74 }}>
                      <ProgressBar
                        value={(p.stock / Math.max(1, p.minStock)) * 100}
                        tone={p.stock === 0 ? 'red' : 'amber'}
                      />
                      <div className="list-sub" style={{ marginTop: 4, textAlign: 'right' }}>
                        {p.stock} {p.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Dernières ventes</h3>
              <p className="card-sub">Encaissements récents</p>
            </div>
            <div className="card-actions">
              <button className="btn btn-mint btn-sm" onClick={() => go('sales')}>
                <Plus /> Nouvelle vente
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th className="num">Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((s) => {
                  const total = saleTotal(s)
                  const status = s.amountPaid >= total - 0.5 ? 'payée' : s.amountPaid > 0 ? 'partielle' : 'impayée'
                  return (
                    <tr key={s.id} onClick={() => go('sales')} style={{ cursor: 'pointer' }}>
                      <td className="strong">{s.reference}</td>
                      <td>{s.customerName}</td>
                      <td className="faint nowrap">{formatDate(s.date)}</td>
                      <td className="num strong">{formatMoney(total, currency)}</td>
                      <td>
                        <Badge tone={status === 'payée' ? 'green' : status === 'partielle' ? 'amber' : 'red'}>{status}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Top produits</h3>
                <p className="card-sub">Par chiffre d'affaires généré</p>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop: 2 }}>
              <div className="list">
                {best.map((p, i) => (
                  <div className="list-item" key={p.name}>
                    <div className="avatar" style={{ background: '#eef2f0', color: '#3f5149' }}>{i + 1}</div>
                    <div className="list-main">
                      <div className="list-title">{p.name}</div>
                      <div className="list-sub">{p.quantity} unités vendues</div>
                    </div>
                    <div className="list-value">{formatMoney(p.revenue, currency)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <h3 className="card-title">Répartition du stock</h3>
                <p className="card-sub">Valeur d'achat par catégorie</p>
              </div>
            </div>
            <div className="card-body">
              <div className="stack" style={{ gap: 11 }}>
                {categories.map((c) => (
                  <div key={c.category}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{c.category}</span>
                      <span className="small faint tabular">{formatMoney(c.value, currency)}</span>
                    </div>
                    <ProgressBar value={(c.value / totalCategory) * 100} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Tendance 14 jours</h3>
              <p className="card-sub">Chiffre d'affaires quotidien</p>
            </div>
            <div className="card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => go('reports')}>
                <ReceiptText /> Rapport
              </button>
            </div>
          </div>
          <div className="card-body">
            <BarChart
              data={series.map((d) => ({
                label: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                value: Math.round(d.revenue),
              }))}
              format={formatCompact}
            />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Meilleurs clients</h3>
              <p className="card-sub">Cumul historique</p>
            </div>
            <div className="card-actions">
              <button className="btn btn-outline btn-sm" onClick={() => go('customers')}>
                <Users /> Clients
              </button>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 2 }}>
            {clients.length === 0 ? (
              <EmptyState icon={<Users />} title="Pas encore de client fidèle" description="Rattachez vos ventes à une fiche client pour suivre la fidélité." />
            ) : (
              <div className="list">
                {clients.map((c) => (
                  <div className="list-item" key={c.id}>
                    <div className="avatar">{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</div>
                    <div className="list-main">
                      <div className="list-title">{c.name}</div>
                      <div className="list-sub">{c.count} commande(s)</div>
                    </div>
                    <div className="list-value">{formatMoney(c.revenue, currency)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
