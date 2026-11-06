import type { Database, Product, Sale } from '../types'
import { monthKey, todayISO } from './format'
import { saleCost, saleTotal } from '../types'

export interface Kpis {
  revenue: number
  cost: number
  grossProfit: number
  expenses: number
  netProfit: number
  salesCount: number
  averageBasket: number
  receivable: number
  stockValue: number
  stockCostValue: number
  lowStock: Product[]
  marginRate: number
}

const inMonth = (iso: string, key: string) => monthKey(iso) === key

export const monthSales = (db: Database, key: string): Sale[] =>
  db.sales.filter((s) => inMonth(s.date, key))

export const computeKpis = (db: Database, key = monthKey(todayISO())): Kpis => {
  const sales = monthSales(db, key)
  const revenue = sales.reduce((sum, s) => sum + saleTotal(s), 0)
  const cost = sales.reduce((sum, s) => sum + saleCost(s), 0)
  const expenses = db.expenses
    .filter((e) => inMonth(e.date, key))
    .reduce((sum, e) => sum + e.amount, 0)
  const grossProfit = revenue - cost
  const receivable = db.sales.reduce((sum, s) => sum + Math.max(0, saleTotal(s) - s.amountPaid), 0)
  const stockValue = db.products.reduce((sum, p) => sum + p.stock * p.salePrice, 0)
  const stockCostValue = db.products.reduce((sum, p) => sum + p.stock * p.purchasePrice, 0)

  return {
    revenue,
    cost,
    grossProfit,
    expenses,
    netProfit: grossProfit - expenses,
    salesCount: sales.length,
    averageBasket: sales.length ? revenue / sales.length : 0,
    receivable,
    stockValue,
    stockCostValue,
    lowStock: db.products.filter((p) => p.stock <= p.minStock),
    marginRate: revenue ? (grossProfit / revenue) * 100 : 0,
  }
}

export const lastMonths = (count: number): string[] => {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = count - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export const dailySeries = (db: Database, days: number) => {
  const out: { date: string; revenue: number; profit: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const sales = db.sales.filter((s) => s.date === iso)
    out.push({
      date: iso,
      revenue: sales.reduce((sum, s) => sum + saleTotal(s), 0),
      profit:
        sales.reduce((sum, s) => sum + saleTotal(s) - saleCost(s), 0),
    })
  }
  return out
}

export const topProducts = (db: Database, limit = 5) => {
  const map = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const sale of db.sales) {
    for (const line of sale.lines) {
      const entry = map.get(line.productId) ?? { name: line.name, quantity: 0, revenue: 0 }
      entry.quantity += line.quantity
      entry.revenue += line.quantity * line.unitPrice
      map.set(line.productId, entry)
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit)
}

export const topCustomers = (db: Database, limit = 5) => {
  const map = new Map<string, { name: string; revenue: number; count: number }>()
  for (const sale of db.sales) {
    if (!sale.customerId) continue
    const entry = map.get(sale.customerId) ?? { name: sale.customerName, revenue: 0, count: 0 }
    entry.revenue += saleTotal(sale)
    entry.count += 1
    map.set(sale.customerId, entry)
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export const categoryBreakdown = (db: Database) => {
  const map = new Map<string, number>()
  for (const p of db.products) {
    map.set(p.category, (map.get(p.category) ?? 0) + p.stock * p.purchasePrice)
  }
  return [...map.entries()]
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
}
