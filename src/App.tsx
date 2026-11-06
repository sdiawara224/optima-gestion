import React, { useEffect, useState } from 'react'
import {
  Boxes,
  LayoutDashboard,
  ReceiptText,
  Settings as SettingsIcon,
  ShoppingCart,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react'
import { StoreProvider, useStore } from './store'
import { ToastProvider } from './components/ui'
import { DashboardPage } from './pages/Dashboard'
import { ProductsPage } from './pages/Products'
import { SalesPage } from './pages/Sales'
import { CustomersPage } from './pages/Customers'
import { ExpensesPage } from './pages/Expenses'
import { ReportsPage } from './pages/Reports'
import { SettingsPage } from './pages/Settings'
import { formatDateLong, formatMoney, monthKey, todayISO } from './lib/format'
import { computeKpis } from './lib/stats'

export type Page = 'dashboard' | 'products' | 'sales' | 'customers' | 'expenses' | 'reports' | 'settings'

const NAV: { page: Page; label: string; icon: React.ReactNode; group: string }[] = [
  { page: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard />, group: 'Pilotage' },
  { page: 'sales', label: 'Ventes', icon: <ShoppingCart />, group: 'Activité' },
  { page: 'products', label: 'Stock & produits', icon: <Boxes />, group: 'Activité' },
  { page: 'customers', label: 'Clients', icon: <Users />, group: 'Activité' },
  { page: 'expenses', label: 'Dépenses', icon: <Wallet />, group: 'Gestion' },
  { page: 'reports', label: 'Rapports', icon: <ReceiptText />, group: 'Gestion' },
  { page: 'settings', label: 'Paramètres', icon: <SettingsIcon />, group: 'Gestion' },
]

const TITLES: Record<Page, { title: string; sub: string }> = {
  dashboard: { title: 'Tableau de bord', sub: 'Vue d\u2019ensemble de votre activité' },
  sales: { title: 'Ventes & factures', sub: 'Enregistrez et suivez vos encaissements' },
  products: { title: 'Stock & produits', sub: 'Inventaire, prix et seuils d\u2019alerte' },
  customers: { title: 'Clients', sub: 'Fidélité, historique et encours' },
  expenses: { title: 'Dépenses', sub: 'Charges d\u2019exploitation et fournisseurs' },
  reports: { title: 'Rapports', sub: 'Résultats et exports de votre gestion' },
  settings: { title: 'Paramètres', sub: 'Entreprise, devise et sauvegardes' },
}

const Shell: React.FC = () => {
  const { db } = useStore()
  const [page, setPage] = useState<Page>(() => {
    const hash = window.location.hash.replace('#', '') as Page
    return NAV.some((n) => n.page === hash) ? hash : 'dashboard'
  })

  useEffect(() => {
    window.location.hash = page
    window.scrollTo({ top: 0 })
  }, [page])

  const go = (p: Page) => setPage(p)
  const kpis = computeKpis(db, monthKey(todayISO()))
  const counts: Partial<Record<Page, number>> = {
    products: kpis.lowStock.length,
    sales: db.sales.filter((s) => s.amountPaid < 0.5).length,
  }

  const groups = ['Pilotage', 'Activité', 'Gestion']

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">O</div>
          <div>
            <div className="brand-name">Optima Gestion</div>
            <div className="brand-sub">Suite PME</div>
          </div>
        </div>

        <nav className="nav">
          {groups.map((group) => (
            <React.Fragment key={group}>
              <div className="nav-label">{group}</div>
              {NAV.filter((n) => n.group === group).map((item) => (
                <button
                  key={item.page}
                  className={`nav-link ${page === item.page ? 'active' : ''}`}
                  onClick={() => go(item.page)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {!!counts[item.page] && <span className="nav-count">{counts[item.page]}</span>}
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="shop-card">
            <div className="shop-avatar">{db.settings.businessName.slice(0, 1).toUpperCase()}</div>
            <div style={{ minWidth: 0 }}>
              <div className="shop-name">{db.settings.businessName}</div>
              <div className="shop-role">{db.settings.ownerName}</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar-title">{TITLES[page].title}</h1>
            <p className="topbar-sub">
              {TITLES[page].sub} · {formatDateLong(todayISO())}
            </p>
          </div>
          <div className="topbar-actions">
            {kpis.lowStock.length > 0 && (
              <button
                className="badge amber plain"
                style={{ border: 0, cursor: 'pointer', padding: '6px 11px' }}
                onClick={() => go('products')}
                title="Produits à réapprovisionner"
              >
                <TriangleAlert size={13} /> {kpis.lowStock.length} alerte(s) stock
              </button>
            )}
            <span className="badge green plain" title="Chiffre d'affaires du mois en cours">
              {formatMoney(kpis.revenue, db.settings.currency)} ce mois
            </span>
            <button className="btn btn-mint btn-sm" onClick={() => go('sales')}>
              <ShoppingCart size={15} /> Vendre
            </button>
          </div>
        </header>

        <div className="content">
          {page === 'dashboard' && <DashboardPage go={go} />}
          {page === 'products' && <ProductsPage />}
          {page === 'sales' && <SalesPage />}
          {page === 'customers' && <CustomersPage />}
          {page === 'expenses' && <ExpensesPage />}
          {page === 'reports' && <ReportsPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>

      <nav className="mobile-tabbar">
        {NAV.filter((n) => n.page !== 'reports' && n.page !== 'settings').map((item) => (
          <button key={item.page} className={page === item.page ? 'active' : ''} onClick={() => go(item.page)}>
            {item.icon}
            <span>{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const App: React.FC = () => (
  <StoreProvider>
    <ToastProvider>
      <Shell />
    </ToastProvider>
  </StoreProvider>
)

export default App
