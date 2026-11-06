import React, { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Printer, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '../store'
import { saleCost, saleTotal } from '../types'
import { download, formatMoney, monthKey, monthLabel, todayISO } from '../lib/format'
import { computeKpis, lastMonths, monthSales, topCustomers, topProducts } from '../lib/stats'
import { BarChart, EmptyState, ProgressBar } from '../components/ui'

export const ReportsPage: React.FC = () => {
  const { db } = useStore()
  const currency = db.settings.currency
  const months = lastMonths(12).reverse()
  const [month, setMonth] = useState(monthKey(todayISO()))

  const kpis = computeKpis(db, month)
  const sales = monthSales(db, month)
  const prevKey = (() => {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const prev = computeKpis(db, prevKey)

  const breakEven = kpis.expenses
  const coverage = breakEven > 0 ? (kpis.grossProfit / breakEven) * 100 : 100

  const paymentSplit = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sales) map.set(s.paymentMethod, (map.get(s.paymentMethod) ?? 0) + saleTotal(s))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [sales])

  const best = topProducts(db, 6)
  const clients = topCustomers(db, 5)

  const yearly = lastMonths(12).map((key) => ({
    label: monthLabel(key),
    value: Math.round(monthSales(db, key).reduce((s, x) => s + saleTotal(x), 0)),
  }))

  const exportCsv = () => {
    const rows = [
      ['Référence', 'Date', 'Client', 'Articles', 'Total', 'Encaissé', 'Reste dû', 'Moyen de paiement'],
      ...sales.map((s) => [
        s.reference,
        s.date,
        s.customerName,
        String(s.lines.length),
        String(Math.round(saleTotal(s))),
        String(Math.round(s.amountPaid)),
        String(Math.round(Math.max(0, saleTotal(s) - s.amountPaid))),
        s.paymentMethod,
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')
    download(`optima-ventes-${month}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8')
  }

  const exportJson = () => {
    download(`optima-sauvegarde-${todayISO()}.json`, JSON.stringify(db, null, 2))
  }

  const linesSold = sales.reduce((s, x) => s + x.lines.reduce((a, l) => a + l.quantity, 0), 0)
  const cost = sales.reduce((s, x) => s + saleCost(x), 0)

  return (
    <>
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Rapport de gestion — {monthLabel(month)}</h3>
            <p className="card-sub">Synthèse financière, produits et encaissements de la période</p>
          </div>
          <div className="card-actions no-print">
            <select className="select" style={{ width: 160 }} value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <button className="btn btn-outline btn-sm" onClick={exportCsv}>
              <FileSpreadsheet size={15} /> CSV
            </button>
            <button className="btn btn-outline btn-sm" onClick={exportJson}>
              <Download size={15} /> Sauvegarde
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> Imprimer
            </button>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat hero">
          <div className="stat-label">Chiffre d'affaires</div>
          <div className="stat-value">{formatMoney(kpis.revenue, currency)}</div>
          <div className="stat-foot">{sales.length} ventes · {linesSold} articles vendus</div>
        </div>
        <div className="stat">
          <div className="stat-label">Coût des marchandises</div>
          <div className="stat-value">{formatMoney(cost, currency)}</div>
          <div className="stat-foot">Marge brute {formatMoney(kpis.grossProfit, currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Charges d'exploitation</div>
          <div className="stat-value">{formatMoney(kpis.expenses, currency)}</div>
          <div className="stat-foot">Mois précédent : {formatMoney(prev.expenses, currency)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Résultat net</div>
          <div className="stat-value" style={{ color: kpis.netProfit >= 0 ? '#15803d' : 'var(--red)' }}>
            {formatMoney(kpis.netProfit, currency)}
          </div>
          <div className="stat-foot row" style={{ gap: 5 }}>
            {kpis.netProfit >= prev.netProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            vs {formatMoney(prev.netProfit, currency)} le mois précédent
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Chiffre d'affaires sur 12 mois</h3>
              <p className="card-sub">Suivi de la saisonnalité</p>
            </div>
          </div>
          <div className="card-body">
            <BarChart data={yearly} format={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Compte de résultat simplifié</h3>
              <p className="card-sub">{monthLabel(month)}</p>
            </div>
          </div>
          <div className="card-body">
            <div className="stack" style={{ gap: 0 }}>
              <div className="summary-row" style={{ padding: '9px 0' }}>
                <span>Ventes</span><strong>{formatMoney(kpis.revenue, currency)}</strong>
              </div>
              <div className="summary-row" style={{ padding: '9px 0', borderTop: '1px solid #f0f3f1' }}>
                <span>− Coût d'achat des marchandises</span><strong>{formatMoney(cost, currency)}</strong>
              </div>
              <div className="summary-row" style={{ padding: '9px 0', borderTop: '1px solid #f0f3f1' }}>
                <span>= Marge brute</span>
                <strong style={{ color: kpis.grossProfit >= 0 ? '#15803d' : 'var(--red)' }}>
                  {formatMoney(kpis.grossProfit, currency)}
                </strong>
              </div>
              <div className="summary-row" style={{ padding: '9px 0', borderTop: '1px solid #f0f3f1' }}>
                <span>− Charges d'exploitation</span><strong>{formatMoney(kpis.expenses, currency)}</strong>
              </div>
              <div className="summary-row total" style={{ padding: '11px 0' }}>
                <span>= Résultat net</span>
                <strong style={{ color: kpis.netProfit >= 0 ? '#15803d' : 'var(--red)' }}>
                  {formatMoney(kpis.netProfit, currency)}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="small muted">Couverture des charges par la marge</span>
                <span className="small" style={{ fontWeight: 600 }}>{Math.round(coverage)} %</span>
              </div>
              <ProgressBar value={coverage} tone={coverage >= 100 ? 'green' : coverage >= 70 ? 'amber' : 'red'} />
              <p className="faint" style={{ fontSize: 11.6, marginTop: 6 }}>
                Objectif : au moins 100 % pour couvrir loyer, salaires et autres charges avec la marge brute.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2-even">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Produits les plus rentables</h3>
              <p className="card-sub">Cumul des ventes enregistrées</p>
            </div>
          </div>
          <div className="card-body">
            {best.length === 0 ? (
              <EmptyState icon={<TrendingUp />} title="Pas encore de données" description="Enregistrez des ventes pour voir vos meilleurs produits." />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th className="num">Qté</th>
                    <th className="num">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {best.map((p) => (
                    <tr key={p.name}>
                      <td className="cell-title">{p.name}</td>
                      <td className="num">{p.quantity}</td>
                      <td className="num strong">{formatMoney(p.revenue, currency)}</td>
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
              <h3 className="card-title">Encaissements par moyen de paiement</h3>
              <p className="card-sub">{monthLabel(month)}</p>
            </div>
          </div>
          <div className="card-body">
            {paymentSplit.length === 0 ? (
              <EmptyState icon={<Download />} title="Aucun encaissement" description="Aucune vente sur la période sélectionnée." />
            ) : (
              <div className="stack" style={{ gap: 13 }}>
                {paymentSplit.map(([method, amount]) => (
                  <div key={method}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="small" style={{ fontWeight: 600 }}>{method}</span>
                      <span className="small faint tabular">{formatMoney(amount, currency)}</span>
                    </div>
                    <ProgressBar value={kpis.revenue ? (amount / kpis.revenue) * 100 : 0} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              <div className="card-title" style={{ fontSize: 13.5, marginBottom: 8 }}>Meilleurs clients du mois</div>
              <div className="list">
                {clients.length === 0 ? (
                  <p className="faint small">Aucune vente nominative.</p>
                ) : (
                  clients.map((c) => (
                    <div className="list-item" key={c.id} style={{ padding: '7px 0' }}>
                      <div className="list-main">
                        <div className="list-title">{c.name}</div>
                        <div className="list-sub">{c.count} commande(s)</div>
                      </div>
                      <div className="list-value">{formatMoney(c.revenue, currency)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="faint small" style={{ textAlign: 'center' }}>
        Rapport généré le {new Date().toLocaleDateString('fr-FR')} · Optima Gestion · Les montants sont exprimés en {currency}
      </p>
    </>
  )
}
