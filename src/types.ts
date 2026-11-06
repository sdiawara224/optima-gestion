export type ID = string

export interface Product {
  id: ID
  sku: string
  name: string
  category: string
  purchasePrice: number
  salePrice: number
  stock: number
  minStock: number
  unit: string
  createdAt: string
}

export interface Customer {
  id: ID
  name: string
  phone: string
  email: string
  city: string
  notes: string
  createdAt: string
}

export type PaymentMethod = 'Espèces' | 'Wave' | 'Orange Money' | 'MTN MoMo' | 'Moov Money' | 'Virement'

export interface SaleLine {
  productId: ID
  name: string
  quantity: number
  unitPrice: number
  purchasePrice: number
}

export type SaleStatus = 'payée' | 'partielle' | 'impayée'

export interface Sale {
  id: ID
  reference: string
  customerId: ID | null
  customerName: string
  date: string
  lines: SaleLine[]
  discount: number
  amountPaid: number
  paymentMethod: PaymentMethod
  note: string
}

export interface Expense {
  id: ID
  label: string
  category: string
  amount: number
  date: string
  paymentMethod: PaymentMethod
}

export interface Settings {
  businessName: string
  ownerName: string
  phone: string
  address: string
  currency: string
  taxRate: number
  lowStockAlert: boolean
}

export interface Database {
  version: 1
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  expenses: Expense[]
  settings: Settings
}

export const saleTotal = (sale: Sale): number =>
  sale.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) - sale.discount

export const saleStatus = (sale: Sale): SaleStatus => {
  const total = saleTotal(sale)
  if (sale.amountPaid >= total - 0.5) return 'payée'
  if (sale.amountPaid > 0) return 'partielle'
  return 'impayée'
}

export const saleCost = (sale: Sale): number =>
  sale.lines.reduce((sum, l) => sum + l.quantity * l.purchasePrice, 0)
