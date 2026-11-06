import React, { useRef, useState } from 'react'
import { Database as DbIcon, Download, RotateCcw, Save, ShieldCheck, Upload } from 'lucide-react'
import { useStore } from '../store'
import type { Database } from '../types'
import { download, formatMoney, todayISO } from '../lib/format'
import { ConfirmButton, Field, useToast } from '../components/ui'

export const SettingsPage: React.FC = () => {
  const { db, dispatch, reset, replace } = useStore()
  const toast = useToast()
  const [form, setForm] = useState(db.settings)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v })

  const save = () => {
    dispatch({ type: 'settings/save', settings: form })
    toast('Paramètres enregistrés')
  }

  const exportAll = () => {
    download(`optima-sauvegarde-${todayISO()}.json`, JSON.stringify(db, null, 2))
    toast('Sauvegarde téléchargée')
  }

  const importFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Database
        if (!parsed.products || !parsed.sales || !parsed.settings) throw new Error('format invalide')
        replace(parsed)
        setForm(parsed.settings)
        toast('Sauvegarde restaurée')
      } catch {
        toast('Fichier invalide — import annulé')
      }
    }
    reader.readAsText(file)
  }

  const totals = [
    { label: 'Produits', value: db.products.length },
    { label: 'Clients', value: db.customers.length },
    { label: 'Ventes', value: db.sales.length },
    { label: 'Dépenses', value: db.expenses.length },
  ]

  return (
    <div className="grid-2">
      <div className="stack">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Informations de l'entreprise</h3>
              <p className="card-sub">Ces données apparaissent sur vos factures</p>
            </div>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <Field label="Nom commercial" span2>
                <input className="input" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </Field>
              <Field label="Responsable">
                <input className="input" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
              </Field>
              <Field label="Téléphone">
                <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Adresse" span2>
                <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Devise">
                <select className="select" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                  {['FCFA', 'GNF', 'XOF', 'EUR', 'USD', 'MAD'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Taux de TVA (%)" hint="0 si vous n'êtes pas assujetti">
                <input className="input" type="number" min={0} value={form.taxRate} onChange={(e) => set('taxRate', Number(e.target.value))} />
              </Field>
              <div className="field span-2">
                <label>Alertes</label>
                <label className="row" style={{ gap: 8, fontSize: 13.4, fontWeight: 500 }}>
                  <input type="checkbox" checked={form.lowStockAlert} onChange={(e) => set('lowStockAlert', e.target.checked)} />
                  M'afficher une alerte lorsqu'un produit passe sous son seuil de stock
                </label>
              </div>
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={save}>
                <Save size={15} /> Enregistrer les paramètres
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Sauvegarde & restauration</h3>
              <p className="card-sub">Vos données restent sur cet appareil (stockage local du navigateur)</p>
            </div>
          </div>
          <div className="card-body">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={exportAll}>
                <Download size={15} /> Exporter mes données (JSON)
              </button>
              <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
                <Upload size={15} /> Restaurer une sauvegarde
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importFile(f)
                  e.target.value = ''
                }}
              />
              <ConfirmButton
                label="Réinitialiser les données de démo"
                onConfirm={() => {
                  reset()
                  toast('Données de démonstration restaurées')
                }}
              >
                <RotateCcw size={15} /> Réinitialiser la démo
              </ConfirmButton>
            </div>
            <p className="faint small" style={{ marginTop: 12 }}>
              Astuce : exportez régulièrement une sauvegarde JSON. Elle contient vos produits, clients, ventes, dépenses et
              paramètres.
            </p>
          </div>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Contenu de la base</h3>
              <p className="card-sub">Volumétrie actuelle</p>
            </div>
          </div>
          <div className="card-body">
            <div className="stack" style={{ gap: 10 }}>
              {totals.map((t) => (
                <div key={t.label} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f3f1' }}>
                  <span className="small muted">{t.label}</span>
                  <strong>{t.value}</strong>
                </div>
              ))}
              <div className="row" style={{ justifyContent: 'space-between', paddingTop: 6 }}>
                <span className="small muted">Valeur du stock</span>
                <strong>{formatMoney(db.products.reduce((s, p) => s + p.stock * p.purchasePrice, 0), form.currency)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Confidentialité</h3>
              <p className="card-sub">Comment Optima Gestion traite vos données</p>
            </div>
            <div className="card-actions"><ShieldCheck size={18} color="#15803d" /></div>
          </div>
          <div className="card-body">
            <p className="small muted" style={{ lineHeight: 1.65 }}>
              Aucune donnée n'est envoyée sur un serveur. Tout est enregistré dans le stockage local de votre navigateur, sur
              cet appareil. Vider le cache du navigateur efface les données : pensez à exporter une sauvegarde.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">À propos</h3>
              <p className="card-sub">Optima Gestion v0.1</p>
            </div>
            <div className="card-actions"><DbIcon size={18} color="#15803d" /></div>
          </div>
          <div className="card-body">
            <p className="small muted" style={{ lineHeight: 1.65 }}>
              Gestion de stock, ventes, clients et dépenses pour les commerçants et PME. Interface en français, montants en
              FCFA, pensée pour une utilisation sur mobile comme sur ordinateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
