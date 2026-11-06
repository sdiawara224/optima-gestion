import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import type { Customer, Database, Expense, ID, Product, Sale, Settings } from './types'
import { daysAgoISO, uid } from './lib/format'

const STORAGE_KEY = 'optima-gestion:v1'

/* ------------------------------------------------------------------ seed */

const seed = (): Database => {
  const products: Product[] = [
    { id: uid('prd'), sku: 'RZ-001', name: 'Riz parfumé 25 kg', category: 'Alimentation', purchasePrice: 155000, salePrice: 185000, stock: 42, minStock: 10, unit: 'sac', createdAt: daysAgoISO(120) },
    { id: uid('prd'), sku: 'HV-004', name: 'Huile végétale 5 L', category: 'Alimentation', purchasePrice: 48000, salePrice: 58000, stock: 8, minStock: 12, unit: 'bidon', createdAt: daysAgoISO(110) },
    { id: uid('prd'), sku: 'SU-012', name: 'Sucre cristallisé 1 kg', category: 'Alimentation', purchasePrice: 8500, salePrice: 11000, stock: 130, minStock: 30, unit: 'kg', createdAt: daysAgoISO(98) },
    { id: uid('prd'), sku: 'SB-003', name: 'Savon de Marseille', category: 'Hygiène', purchasePrice: 2200, salePrice: 3500, stock: 210, minStock: 50, unit: 'pièce', createdAt: daysAgoISO(80) },
    { id: uid('prd'), sku: 'DE-021', name: 'Détergent liquide 1 L', category: 'Hygiène', purchasePrice: 9500, salePrice: 13500, stock: 4, minStock: 15, unit: 'flacon', createdAt: daysAgoISO(76) },
    { id: uid('prd'), sku: 'CA-007', name: 'Café moulu 250 g', category: 'Boissons', purchasePrice: 12000, salePrice: 17500, stock: 64, minStock: 20, unit: 'paquet', createdAt: daysAgoISO(60) },
    { id: uid('prd'), sku: 'EA-002', name: 'Eau minérale 1,5 L (pack 6)', category: 'Boissons', purchasePrice: 14000, salePrice: 19000, stock: 25, minStock: 10, unit: 'pack', createdAt: daysAgoISO(52) },
    { id: uid('prd'), sku: 'TE-015', name: 'Thé vert 500 g', category: 'Boissons', purchasePrice: 16000, salePrice: 23000, stock: 18, minStock: 8, unit: 'paquet', createdAt: daysAgoISO(40) },
    { id: uid('prd'), sku: 'PA-009', name: 'Pâtes alimentaires 500 g', category: 'Alimentation', purchasePrice: 4500, salePrice: 6500, stock: 95, minStock: 25, unit: 'paquet', createdAt: daysAgoISO(30) },
    { id: uid('prd'), sku: 'PA-001', name: 'Papier hygiénique (pack 4)', category: 'Hygiène', purchasePrice: 11000, salePrice: 15500, stock: 31, minStock: 10, unit: 'pack', createdAt: daysAgoISO(21) },
  ]

  const customers: Customer[] = [
    { id: uid('cus'), name: 'Mariam Diallo', phone: '+224 622 11 22 33', email: 'mariam.diallo@gmail.com', city: 'Conakry', notes: 'Boutique de quartier — livraison le samedi.', createdAt: daysAgoISO(140) },
    { id: uid('cus'), name: 'Ibrahima Camara', phone: '+224 621 44 55 66', email: 'i.camara@yahoo.fr', city: 'Matoto', notes: 'Gros client, remise habituelle 2 %.', createdAt: daysAgoISO(120) },
    { id: uid('cus'), name: 'Fatoumata Bah', phone: '+224 628 77 88 99', email: 'fatou.bah@outlook.com', city: 'Ratoma', notes: '', createdAt: daysAgoISO(95) },
    { id: uid('cus'), name: 'Restaurant Le Baobab', phone: '+224 664 30 40 50', email: 'contact@lebaobab.gn', city: 'Kaloum', notes: 'Commande hebdomadaire le lundi.', createdAt: daysAgoISO(70) },
    { id: uid('cus'), name: 'Sékou Touré', phone: '+224 620 90 12 34', email: '', city: 'Dixinn', notes: 'Passe en boutique.', createdAt: daysAgoISO(45) },
  ]

  const methods = ['Espèces', 'Wave', 'Orange Money', 'MTN MoMo', 'Virement'] as const
  const sales: Sale[] = []
  const pick = <T,>(arr: readonly T[], i: number): T => arr[i % arr.length]

  for (let i = 0; i < 34; i++) {
    const dayOffset = Math.floor((i * 89) % 210)
    const date = daysAgoISO(dayOffset)
    const customer = i % 6 === 0 ? null : pick(customers, i * 3)
    const lineCount = (i % 3) + 1
    const lines = Array.from({ length: lineCount }, (_, k) => {
      const p = pick(products, i * 5 + k * 3)
      const quantity = ((i + k) % 4) + 1
      return { productId: p.id, name: p.name, quantity, unitPrice: p.salePrice, purchasePrice: p.purchasePrice }
    })
    const gross = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    const discount = i % 7 === 0 ? Math.round(gross * 0.02) : 0
    const total = gross - discount
    const paidRatio = i % 9 === 0 ? 0.4 : i % 11 === 0 ? 0 : 1
    sales.push({
      id: uid('sal'),
      reference: `FA-${String(1042 - i)}`,
      customerId: customer ? customer.id : null,
      customerName: customer ? customer.name : 'Client de passage',
      date,
      lines,
      discount,
      amountPaid: Math.round(total * paidRatio),
      paymentMethod: pick(methods, i),
      note: '',
    })
  }

  const expenses: Expense[] = [
    { id: uid('exp'), label: 'Loyer boutique', category: 'Loyer', amount: 1200000, date: daysAgoISO(58), paymentMethod: 'Virement' },
    { id: uid('exp'), label: 'Électricité (EDG)', category: 'Énergie', amount: 385000, date: daysAgoISO(41), paymentMethod: 'Espèces' },
    { id: uid('exp'), label: 'Salaires équipe', category: 'Salaires', amount: 3200000, date: daysAgoISO(31), paymentMethod: 'Wave' },
    { id: uid('exp'), label: 'Carburant livraison', category: 'Transport', amount: 240000, date: daysAgoISO(18), paymentMethod: 'Espèces' },
    { id: uid('exp'), label: 'Réapprovisionnement dépôt', category: 'Achat stock', amount: 2600000, date: daysAgoISO(12), paymentMethod: 'Orange Money' },
    { id: uid('exp'), label: 'Publicité Facebook', category: 'Marketing', amount: 150000, date: daysAgoISO(6), paymentMethod: 'MTN MoMo' },
    { id: uid('exp'), label: 'Loyer boutique', category: 'Loyer', amount: 1200000, date: daysAgoISO(3), paymentMethod: 'Virement' },
    { id: uid('exp'), label: 'Emballages & sacs', category: 'Fournitures', amount: 95000, date: daysAgoISO(1), paymentMethod: 'Espèces' },
  ]

  return {
    version: 1,
    products,
    customers,
    sales,
    expenses,
    settings: {
      businessName: 'Optima Boutique',
      ownerName: 'Alpha Diallo',
      phone: '+224 622 00 11 22',
      address: 'Marché Madina, Conakry',
      currency: 'FCFA',
      taxRate: 0,
      lowStockAlert: true,
    },
  }
}

/* ---------------------------------------------------------------- reducer */

type Action =
  | { type: 'product/save'; product: Product }
  | { type: 'product/delete'; id: ID }
  | { type: 'product/adjustStock'; id: ID; delta: number }
  | { type: 'customer/save'; customer: Customer }
  | { type: 'customer/delete'; id: ID }
  | { type: 'sale/create'; sale: Sale }
  | { type: 'sale/delete'; id: ID }
  | { type: 'sale/payment'; id: ID; amount: number }
  | { type: 'expense/save'; expense: Expense }
  | { type: 'expense/delete'; id: ID }
  | { type: 'settings/save'; settings: Settings }
  | { type: 'db/replace'; db: Database }
  | { type: 'db/reset' }

const applyStock = (products: Product[], sale: Sale, direction: 1 | -1): Product[] =>
  products.map((p) => {
    const line = sale.lines.find((l) => l.productId === p.id)
    if (!line) return p
    return { ...p, stock: p.stock - direction * line.quantity }
  })

const reducer = (state: Database, action: Action): Database => {
  switch (action.type) {
    case 'product/save': {
      const exists = state.products.some((p) => p.id === action.product.id)
      return {
        ...state,
        products: exists
          ? state.products.map((p) => (p.id === action.product.id ? action.product : p))
          : [action.product, ...state.products],
      }
    }
    case 'product/delete':
      return { ...state, products: state.products.filter((p) => p.id !== action.id) }
    case 'product/adjustStock':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.id ? { ...p, stock: Math.max(0, p.stock + action.delta) } : p,
        ),
      }
    case 'customer/save': {
      const exists = state.customers.some((c) => c.id === action.customer.id)
      return {
        ...state,
        customers: exists
          ? state.customers.map((c) => (c.id === action.customer.id ? action.customer : c))
          : [action.customer, ...state.customers],
      }
    }
    case 'customer/delete':
      return {
        ...state,
        customers: state.customers.filter((c) => c.id !== action.id),
        sales: state.sales.map((s) =>
          s.customerId === action.id ? { ...s, customerId: null, customerName: 'Client de passage' } : s,
        ),
      }
    case 'sale/create':
      return {
        ...state,
        sales: [action.sale, ...state.sales],
        products: applyStock(state.products, action.sale, 1),
      }
    case 'sale/delete': {
      const sale = state.sales.find((s) => s.id === action.id)
      if (!sale) return state
      return {
        ...state,
        sales: state.sales.filter((s) => s.id !== action.id),
        products: applyStock(state.products, sale, -1),
      }
    }
    case 'sale/payment':
      return {
        ...state,
        sales: state.sales.map((s) =>
          s.id === action.id ? { ...s, amountPaid: s.amountPaid + action.amount } : s,
        ),
      }
    case 'expense/save': {
      const exists = state.expenses.some((e) => e.id === action.expense.id)
      return {
        ...state,
        expenses: exists
          ? state.expenses.map((e) => (e.id === action.expense.id ? action.expense : e))
          : [action.expense, ...state.expenses],
      }
    }
    case 'expense/delete':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.id) }
    case 'settings/save':
      return { ...state, settings: action.settings }
    case 'db/replace':
      return action.db
    case 'db/reset':
      return seed()
    default:
      return state
  }
}

const load = (): Database => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Database
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.products)) return seed()
    return { ...seed(), ...parsed }
  } catch {
    return seed()
  }
}

/* ---------------------------------------------------------------- context */

interface StoreValue {
  db: Database
  dispatch: React.Dispatch<Action>
  reset: () => void
  replace: (db: Database) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
    } catch {
      /* quota exceeded — ignore */
    }
  }, [db])

  const reset = useCallback(() => dispatch({ type: 'db/reset' }), [])
  const replace = useCallback((next: Database) => dispatch({ type: 'db/replace', db: next }), [])

  const value = useMemo(() => ({ db, dispatch, reset, replace }), [db, reset, replace])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = (): StoreValue => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore doit être utilisé dans un StoreProvider')
  return ctx
}
