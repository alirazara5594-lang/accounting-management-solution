import { useState, useEffect } from 'react'
import {
  ChevronRight, Globe, Key, CheckCircle2, ArrowLeft,
  Briefcase, ShoppingCart, Factory, ShoppingBag,
  Landmark, BookOpen, Boxes, Users, MapPin, Scale, Sparkles, Building2, ShieldCheck
} from 'lucide-react'
import type { UserData } from '../Login'
import { setActiveCurrency } from '../lib/currency'
import { setLicenseMode as syncLicenseMode, activateLicenseKey, type LicenseModeId } from '../licenseManager'
import { GLOBAL_TAX_STRUCTURES, type RegionTaxConfig, type TaxCodeOption } from '../lib/taxLocalization'

const LICENSE_MODES = [
  {
    id: 'trial-90',
    title: '90-Day Free Commercial Trial',
    badge: 'Standard 3-Month Trial',
    desc: 'Full access to all modules for 90 days. Ideal for new client evaluations.'
  },
  {
    id: 'trial-180',
    title: '180-Day Extended Commercial Trial',
    badge: '6-Month Extended Trial',
    desc: 'Extended evaluation period for larger enterprises & multi-branch rollouts.'
  },
  {
    id: 'beta-365',
    title: 'Founding Customer / Beta Partner',
    badge: '1-Year Free Access',
    desc: 'Free pilot access in exchange for sector feedback and feature suggestions.'
  },
  {
    id: 'licensed',
    title: 'Commercial Licensed Edition',
    badge: 'Enter Key',
    desc: 'Unlock permanent or annual license using a signed AMS License Key.'
  }
]

const COUNTRIES = [
  { code: 'PK', name: 'Pakistan', currency: 'PKR', flag: '🇵🇰', tax: 'FBR GST & Provincial' },
  { code: 'US', name: 'United States', currency: 'USD', flag: '🇺🇸', tax: 'State Sales Tax' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', flag: '🇬🇧', tax: 'HMRC Standard VAT 20%' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', flag: '🇦🇪', tax: 'FTA Standard VAT 5%' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', flag: '🇸🇦', tax: 'ZATCA VAT 15%' },
  { code: 'CA', name: 'Canada', currency: 'CAD', flag: '🇨🇦', tax: 'CRA GST / HST / PST' },
  { code: 'DE', name: 'Germany', currency: 'EUR', flag: '🇩🇪', tax: 'EU Standard VAT 19%' },
  { code: 'EU', name: 'European Union', currency: 'EUR', flag: '🇪🇺', tax: 'EU Cross-Border VAT 21%' },
]

export const WORLD_BUSINESS_SECTORS = [
  {
    group: '💼 Services, Consulting & Professional',
    sectors: [
      { id: 'Services_Professional', name: 'Professional Services & Business Consulting', modules: ['overview', 'sales', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
      { id: 'Services_IT', name: 'IT Services, Software Development & Digital Agency', modules: ['overview', 'sales', 'projects', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
      { id: 'Services_Legal', name: 'Legal, Law Firms & Corporate Compliance', modules: ['overview', 'sales', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Services_RealEstate', name: 'Real Estate Brokerage & Property Management', modules: ['overview', 'sales', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🛒 Commerce, Trade & Logistics',
    sectors: [
      { id: 'Retail_Supermarket', name: 'Retail, Supermarkets & FMCG Store Chains', modules: ['overview', 'sales', 'procurement', 'assets', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Retail_Ecommerce', name: 'E-Commerce & Online Direct-to-Consumer (D2C)', modules: ['overview', 'sales', 'procurement', 'assets', 'banking', 'accounting', 'analytics', 'compliance', 'administration'] },
      { id: 'Trade_Wholesale', name: 'Wholesale, Import/Export & Distribution', modules: ['overview', 'sales', 'procurement', 'assets', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Logistics_Transport', name: 'Transportation, Freight Forwarding & Warehousing', modules: ['overview', 'field', 'sales', 'procurement', 'assets', 'payroll', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🏭 Manufacturing, Industrial & Heavy Sector',
    sectors: [
      { id: 'Mfg_General', name: 'General Industrial Manufacturing & Assembly', modules: ['overview', 'manufacturing', 'procurement', 'assets', 'sales', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
      { id: 'Mfg_Textile', name: 'Textile, Garments & Apparel Manufacturing', modules: ['overview', 'manufacturing', 'procurement', 'assets', 'sales', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
      { id: 'Mfg_Food', name: 'Food & Beverage Processing / Packaging', modules: ['overview', 'manufacturing', 'procurement', 'assets', 'sales', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Mfg_Automotive', name: 'Automotive Parts, Machinery & Hardware', modules: ['overview', 'manufacturing', 'procurement', 'assets', 'sales', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Mfg_Chemical', name: 'Chemicals, Plastics & Industrial Raw Materials', modules: ['overview', 'manufacturing', 'procurement', 'assets', 'sales', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🏗️ Construction, Contracting & Infrastructure',
    sectors: [
      { id: 'Const_Civil', name: 'Construction, Civil Engineering & General Contracting', modules: ['overview', 'projects', 'field', 'procurement', 'sales', 'payroll', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Const_MEP', name: 'MEP, HVAC & Specialized Subcontracting', modules: ['overview', 'projects', 'field', 'procurement', 'sales', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Energy_OilGas', name: 'Energy, Solar, Oil & Gas, Mining & Utilities', modules: ['overview', 'projects', 'procurement', 'assets', 'accounting', 'banking', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🏥 Healthcare, Pharma & Science',
    sectors: [
      { id: 'Health_Hospital', name: 'Hospitals, Medical Clinics & Diagnostic Centers', modules: ['overview', 'sales', 'procurement', 'assets', 'payroll', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Health_Pharma', name: 'Pharmaceutical Manufacturing & Pharmacy Chains', modules: ['overview', 'manufacturing', 'procurement', 'assets', 'sales', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🏨 Hospitality, Food & Tourism',
    sectors: [
      { id: 'Hosp_Restaurant', name: 'Restaurants, Cafes, Bakeries & Food Chains', modules: ['overview', 'sales', 'procurement', 'assets', 'payroll', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'Hosp_Hotel', name: 'Hotels, Resorts & Travel / Tourism Management', modules: ['overview', 'sales', 'procurement', 'assets', 'payroll', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🌾 Agriculture, Dairy & Livestock',
    sectors: [
      { id: 'Agri_Farming', name: 'Agriculture, Crop Farming & Agro-Commodities', modules: ['overview', 'procurement', 'assets', 'manufacturing', 'sales', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
      { id: 'Agri_Dairy', name: 'Dairy, Livestock & Poultry Farming', modules: ['overview', 'procurement', 'assets', 'manufacturing', 'sales', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🎓 Education, FinTech & Non-Profit',
    sectors: [
      { id: 'Edu_Institution', name: 'Schools, Colleges, Universities & Academies', modules: ['overview', 'sales', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
      { id: 'Fin_FinTech', name: 'Financial Services, Microfinance & FinTech Lending', modules: ['overview', 'banking', 'accounting', 'compliance', 'analytics', 'administration'] },
      { id: 'NonProfit_NGO', name: 'Non-Profit Organizations, NGOs & Charities', modules: ['overview', 'projects', 'procurement', 'banking', 'accounting', 'payroll', 'compliance', 'analytics', 'administration'] },
    ]
  },
  {
    group: '🏛️ Conglomerate / All Enterprise Modules',
    sectors: [
      { id: 'All_FullSuite', name: 'Holding Company / Full Enterprise Suite (All 11 Modules)', modules: ['overview', 'sales', 'procurement', 'banking', 'accounting', 'assets', 'manufacturing', 'payroll', 'projects', 'field', 'compliance', 'analytics', 'administration'] },
    ]
  }
]

const ERP_MODULES = [
  { id: 'sales', label: 'Sales & Invoicing', desc: 'Invoices, Quotes, Orders, Customer Aging', icon: ShoppingCart },
  { id: 'procurement', label: 'Purchasing & Procurement', desc: 'Vendor Bills, POs, Debit Notes, Payables', icon: ShoppingBag },
  { id: 'banking', label: 'Banking & Treasury', desc: 'Bank Accounts, Reconciliations, Fund Transfers', icon: Landmark },
  { id: 'accounting', label: 'Core Accounting & Ledger', desc: 'Double-entry journals, Chart of Accounts, P&L', icon: BookOpen },
  { id: 'assets', label: 'Assets & Inventory', desc: 'Stock valuation, warehouses, asset depreciation', icon: Boxes },
  { id: 'manufacturing', label: 'Manufacturing & BOM', desc: 'Work Orders, bill of materials, WIP job costing', icon: Factory },
  { id: 'payroll', label: 'Payroll & HR Administration', desc: 'Salaries, attendance, leave, employee records', icon: Users },
  { id: 'projects', label: 'Project Accounting', desc: 'Project budgets, milestone billing, timesheets', icon: Briefcase },
  { id: 'field', label: 'Field Operations & Surveys', desc: 'Site inspections, work orders, field expenses', icon: MapPin },
  { id: 'compliance', label: 'Government Tax Compliance', desc: 'VAT/GST returns, withholding tax, e-invoicing', icon: Scale },
  { id: 'analytics', label: 'AI Analytics & Insights', desc: 'Cash flow forecasting, financial intelligence', icon: Sparkles },
]

export default function OnboardingWizard({ currentUser }: {
  currentUser: UserData
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [licenseMode, setLicenseMode] = useState<LicenseModeId>('trial-90')
  const [licenseKeyInput, setLicenseKeyInput] = useState('')
  const [country, setCountry] = useState('PK')
  const [regionId, setRegionId] = useState('punjab')
  const [taxNumber, setTaxNumber] = useState('')
  const [selectedTaxCodes, setSelectedTaxCodes] = useState<string[]>([])
  const [selectedSectorId, setSelectedSectorId] = useState('All_FullSuite')
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'overview', 'sales', 'procurement', 'banking', 'accounting',
    'assets', 'manufacturing', 'payroll', 'projects', 'field', 'compliance', 'analytics', 'administration'
  ])
  const [companyName, setCompanyName] = useState('Apex Enterprise')
  const [saving, setSaving] = useState(false)

  // Current Country & Region Tax Config
  const countryConfig = GLOBAL_TAX_STRUCTURES[country] || GLOBAL_TAX_STRUCTURES.PK
  const activeRegion = countryConfig.regions.find(r => r.id === regionId) || countryConfig.regions[0]

  // When Country Changes, update default region and tax codes
  useEffect(() => {
    const defaultRegion = countryConfig.regions[0]
    if (defaultRegion) {
      setRegionId(defaultRegion.id)
      setSelectedTaxCodes(defaultRegion.taxCodes.map(tc => tc.code))
    }
  }, [country])

  // When Region Changes, update active tax codes
  const handleRegionChange = (newRegionId: string) => {
    setRegionId(newRegionId)
    const region = countryConfig.regions.find(r => r.id === newRegionId)
    if (region) {
      setSelectedTaxCodes(region.taxCodes.map(tc => tc.code))
    }
  }

  const toggleTaxCode = (code: string) => {
    setSelectedTaxCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const handleSectorChange = (sectorId: string) => {
    setSelectedSectorId(sectorId)
    for (const grp of WORLD_BUSINESS_SECTORS) {
      const match = grp.sectors.find(s => s.id === sectorId)
      if (match) {
        setSelectedModules(Array.from(new Set([...match.modules, 'overview', 'administration'])))
        break
      }
    }
  }

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    setSelectedSectorId('All_FullSuite')
    setSelectedModules([
      'overview', 'sales', 'procurement', 'banking', 'accounting',
      'assets', 'manufacturing', 'payroll', 'projects', 'field', 'compliance', 'analytics', 'administration'
    ])
  }

  const handleFinish = async () => {
    setSaving(true)
    const selectedCountry = COUNTRIES.find(c => c.code === country) || COUNTRIES[0]
    const finalCompanyName = companyName.trim() || 'Apex Enterprise'

    setActiveCurrency(selectedCountry.currency)
    localStorage.setItem('onboarding_country', selectedCountry.code)
    localStorage.setItem('onboarding_country_name', selectedCountry.name)
    localStorage.setItem('onboarding_region_id', regionId)
    localStorage.setItem('onboarding_region_name', activeRegion?.name || 'Standard')
    localStorage.setItem('onboarding_tax_authority', activeRegion?.taxAuthority || selectedCountry.tax)
    localStorage.setItem('onboarding_tax_number', taxNumber.trim())

    // Filter only active chosen tax codes for Invoicing
    const activeCodesList = (activeRegion?.taxCodes || []).filter(tc =>
      selectedTaxCodes.length === 0 || selectedTaxCodes.includes(tc.code)
    )
    localStorage.setItem('onboarding_active_tax_codes', JSON.stringify(activeCodesList))

    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const finalModules = Array.from(new Set([...selectedModules, 'overview', 'administration']));
    if (userEmail) {
      localStorage.setItem(`erp_enabled_modules_${userEmail}`, JSON.stringify(finalModules));
    }
    localStorage.setItem('erp_enabled_modules', JSON.stringify(finalModules));
    localStorage.setItem('onboarding_company_name', finalCompanyName);
    localStorage.setItem('onboarding_license_mode', licenseMode);
    localStorage.setItem('onboarding_sector_id', selectedSectorId);

    // Sync license mode and start date
    if (licenseMode === 'licensed' && licenseKeyInput.trim()) {
      activateLicenseKey(licenseKeyInput.trim());
    } else {
      syncLicenseMode(licenseMode, new Date().toISOString());
    }

    // Clear old local company caches so new name displays instantly
    localStorage.removeItem('ab_companies');
    localStorage.removeItem('ams_selected_entity');

    // Clean backend database and initialize company
    try {
      await fetch('http://localhost:5124/api/v1/system/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: finalCompanyName,
          country: selectedCountry?.name || 'Pakistan',
          currency: selectedCountry?.currency || 'PKR',
          taxAuthority: activeRegion?.taxAuthority,
          taxNumber: taxNumber.trim()
        })
      });
    } catch {}

    if (licenseMode === 'licensed' && licenseKeyInput.trim()) {
      try {
        await fetch('http://localhost:5124/api/v1/license/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: licenseKeyInput.trim() })
        })
      } catch {}
    }

    localStorage.setItem(`onboarding_complete_${currentUser.email}`, 'true')
    window.location.hash = '#Overview.Overview'
    window.location.reload()
  }

  const handleBackToLogin = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('ab_demo_mode');
    window.location.reload();
  }

  // Find active sector name
  let activeSectorName = 'Custom Sector Setup';
  for (const grp of WORLD_BUSINESS_SECTORS) {
    const match = grp.sectors.find(s => s.id === selectedSectorId);
    if (match) {
      activeSectorName = match.name;
      break;
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white border-b border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 font-black text-sm">
                AMS
              </div>
              <div>
                <h2 className="font-bold text-base text-white">Company Setup & Sector Tuning</h2>
                <p className="text-xs text-slate-300">Welcome, {currentUser.fullName}. Customize the ERP for your business type.</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s as any)}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    step === s
                      ? 'bg-teal-500 text-white shadow-xs'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                  title={`Jump to Step ${s}`}
                >
                  Step {s}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackToLogin}
                title="Exit and return to sign in"
                className="ml-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕ Exit
              </button>
            </div>
          </div>
        </div>

        {/* Step Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-200 max-h-[65vh] overflow-y-auto">
          {/* STEP 1: License / Deployment Model */}
          {step === 1 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-teal-600" /> 1. Choose Installation License Mode
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Select how you want to deploy this ERP for this client company.</p>
              </div>

              <div className="space-y-2.5">
                {LICENSE_MODES.map(mode => (
                  <div
                    key={mode.id}
                    onClick={() => setLicenseMode(mode.id as any)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      licenseMode === mode.id
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{mode.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                          {mode.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{mode.desc}</p>
                    </div>
                    <input
                      type="radio"
                      checked={licenseMode === mode.id}
                      onChange={() => setLicenseMode(mode.id as any)}
                      className="accent-teal-600 mt-1 shrink-0 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              {licenseMode === 'licensed' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5 animate-in fade-in">
                  <label className="font-bold text-[11px] text-slate-900 dark:text-white">Paste Signed License Key</label>
                  <input
                    type="text"
                    placeholder="AMS-eyJPcmdhbml6YXRpb25OYW1lIj..."
                    value={licenseKeyInput}
                    onChange={e => setLicenseKeyInput(e.target.value)}
                    className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Country, Regional Tax Authority & Base Currency */}
          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600" /> 2. Operating Country, Province & Tax Engine
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Configures global VAT/GST rules, provincial authority rates, and statutory tax numbers.</p>
              </div>

              {/* Country Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COUNTRIES.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountry(c.code)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                      country === c.code
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-teal-600 dark:text-teal-400 font-bold">{c.currency}</span>
                    <span className="text-[9px] text-slate-400 truncate">{c.tax}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Legal Company Name */}
                <div className="space-y-1">
                  <label className="font-bold text-[11px] text-slate-900 dark:text-white">Legal Company / Organization Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Industrial Corporation"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Province / State / Regional Authority (if applicable) */}
                {countryConfig.hasProvinces ? (
                  <div className="space-y-1">
                    <label className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{countryConfig.provinceLabel}</span>
                      <span className="text-[10px] text-teal-600 font-semibold">Localized Authority</span>
                    </label>
                    <select
                      value={regionId}
                      onChange={e => handleRegionChange(e.target.value)}
                      className="w-full text-xs px-3.5 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/40 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    >
                      {countryConfig.regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} · ({r.taxAuthority})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="font-bold text-[11px] text-slate-900 dark:text-white">Statutory Tax Authority</label>
                    <div className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 font-medium">
                      <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="truncate">{activeRegion?.taxAuthority}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Statutory Tax ID & Active Rates Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="space-y-1">
                  <label className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{activeRegion?.taxNumberLabel || 'Tax Registration / VAT ID'}</span>
                    <span className="text-[10px] text-slate-400">Printed on official invoices</span>
                  </label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={e => setTaxNumber(e.target.value)}
                    placeholder={activeRegion?.taxNumberPlaceholder || 'e.g. 1234567-8'}
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Active Tax Codes Available in Invoicing */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Registered Invoicing Tax Rates (Auto-Configured):</span>
                    <span>{selectedTaxCodes.length} active rates</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {activeRegion?.taxCodes.map(tc => {
                      const isSelected = selectedTaxCodes.includes(tc.code);
                      return (
                        <button
                          key={tc.code}
                          type="button"
                          onClick={() => toggleTaxCode(tc.code)}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border-teal-400 dark:border-teal-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-50'
                          }`}
                        >
                          <span>{isSelected ? '✓' : '+'}</span>
                          <span>{tc.label}</span>
                          <span className="px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 font-mono text-[10px]">
                            {tc.rate}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Comprehensive Global Business Sector Dropdown & Granular Modules */}
          {step === 3 && (
            <div className="space-y-3.5 animate-in fade-in">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" /> 3. Select World Business Sector & Modules
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose your exact industry from all world business sectors to automatically configure optimal workflows.
                </p>
              </div>

              {/* Master Sector Dropdown */}
              <div className="p-3.5 rounded-2xl bg-teal-50/40 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-800 space-y-2">
                <label className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center justify-between">
                  <span>🏢 Business Sector / Industry Type (Global Profiles)</span>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold">{selectedModules.length - 2} active modules</span>
                </label>
                <select
                  value={selectedSectorId}
                  onChange={e => handleSectorChange(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {WORLD_BUSINESS_SECTORS.map((grp) => (
                    <optgroup key={grp.group} label={grp.group}>
                      {grp.sectors.map(sec => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Target: <b>{activeSectorName}</b></span>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    Activate All 11 Modules
                  </button>
                </div>
              </div>

              {/* Granular Module Toggles */}
              <div className="space-y-1.5">
                <label className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Included Module Features:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click any module to toggle on/off</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ERP_MODULES.map(mod => {
                    const Icon = mod.icon
                    const active = selectedModules.includes(mod.id)
                    return (
                      <div
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                          active
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 opacity-40'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${active ? 'bg-teal-500/10 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white block">{mod.label}</span>
                            <p className="text-[10px] text-slate-500 leading-tight">{mod.desc}</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={active}
                          readOnly
                          className="accent-teal-600 mt-1 shrink-0"
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Step {step - 1}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBackToLogin}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Launching ERP...' : `Complete Setup (${selectedModules.length - 2} Modules Active)`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
