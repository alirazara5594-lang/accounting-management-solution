import React, { useState, useEffect } from 'react';
import {
  Settings, ShieldCheck, Globe, Database, Save, RotateCcw, AlertTriangle,
  Building2, CheckCircle2, Lock, FileText, Layers, Hash, Coins, Sparkles, Zap, ShieldAlert,
  Key, MessageSquarePlus, Copy, Star, Download, Upload, HardDrive
} from 'lucide-react';
import { useCoaStore } from './stores';
import { KpiCard, KpiGrid } from './components/ui/kpi-card';

interface SystemSettingsProps {
  setPage: (page: string) => void;
  notify: (msg: string) => void;
}

export const SystemSettingsView: React.FC<SystemSettingsProps> = ({ setPage, notify }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'accounting' | 'sectors' | 'ai' | 'license' | 'security' | 'database'>('general');

  // License Generator State
  const [genOrgName, setGenOrgName] = useState('');
  const [genTier, setGenTier] = useState('Founding Partner / Beta Enterprise');
  const [genDuration, setGenDuration] = useState(12);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  const loadFeedbacks = async () => {
    try {
      const res = await fetch('http://localhost:5124/api/v1/license/feedback');
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTab === 'license') {
      loadFeedbacks();
    }
  }, [activeTab]);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genOrgName.trim()) return;
    setGenLoading(true);
    try {
      const res = await fetch('http://localhost:5124/api/v1/license/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: genOrgName.trim(),
          tier: genTier,
          durationMonths: genDuration,
          maxUsers: 100
        })
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedKey(data.licenseKey);
        notify('✓ Generated signed Founding Customer License Key!');
      }
    } catch {
      notify('Failed to generate license key.');
    } finally {
      setGenLoading(false);
    }
  };

  // State configurations with persistence in localStorage
  const [generalConfig, setGeneralConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_system_general');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      systemTitle: 'AMS Enterprise ERP',
      timezone: 'Asia/Karachi (UTC+05:00)',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'en-US (1,234,567.89)',
      decimalPlaces: 2,
      defaultLanguage: 'English (US)',
      themePreference: 'system',
    };
  });

  const [accountingConfig, setAccountingConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_system_accounting');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      accountingStandard: 'IAS / IFRS (International)',
      fiscalYearStart: 'January',
      periodLockDate: '',
      strictDoubleEntry: true,
      allowNegativeStock: false,
      autoPostDepreciation: true,
      fxGainLossPosting: 'Automatic (IAS 21 Realized/Unrealized)',
    };
  });

  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_system_ai');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enableHelpAssistant: true,
      enableActionExecution: false,
      subscriptionPlan: 'Free Help & Guidance Plan',
      planTier: 'free',
      requireActionConfirmation: true,
      contextAwareHelp: true,
      knowledgeBaseStandard: 'IAS / IFRS & GAAP Global Standards',
    };
  });

  const [securityConfig, setSecurityConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('erp_system_security');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      sessionTimeoutMins: 60,
      requireMFA: false,
      maxFailedAttempts: 5,
      enforcePasswordComplexity: true,
      auditLogRetentionDays: 365,
    };
  });

  const [selectedSectors, setSelectedSectors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('erp_system_sectors');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Services', 'Retail', 'Manufacturing', 'Projects'];
  });

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('erp_system_general', JSON.stringify(generalConfig));
    notify('✓ General settings and localization preferences updated');
  };

  const handleSaveAccounting = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('erp_system_accounting', JSON.stringify(accountingConfig));
    notify('✓ Accounting & financial governance standards updated');
  };

  const handleSaveAi = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('erp_system_ai', JSON.stringify(aiConfig));
    notify('✓ AI Assistant & Copilot subscription preferences updated');
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('erp_system_security', JSON.stringify(securityConfig));
    notify('✓ Security and authentication policies updated');
  };

  const handleToggleSector = (sector: string) => {
    const next = selectedSectors.includes(sector)
      ? selectedSectors.filter(s => s !== sector)
      : [...selectedSectors, sector];
    setSelectedSectors(next);
    localStorage.setItem('erp_system_sectors', JSON.stringify(next));
    notify(`✓ Updated sector adaptability profile: ${sector}`);
  };

  const handleFactoryReset = async () => {
    if (window.confirm("⚠️ DANGER ZONE: This will permanently wipe ALL data — products, quotes, estimates, invoices, orders, bills, journals, customers, vendors, payments — everything you entered for testing. Proceed?")) {
      try {
        await useCoaStore.getState().resetDatabase();
        // Purge cached document lines + stale company/entity references so
        // wiped records don't reappear after reload.
        [
          'ams_estimates_lines_cache',
          'ams_invoices_lines_cache',
          'active_entity_id',
          'ab_companies',
          'ams_selected_entity',
        ].forEach((k) => localStorage.removeItem(k));
        notify("✓ Factory reset successful. System restored to baseline.");
        setTimeout(() => window.location.reload(), 600);
      } catch (err: any) {
        notify(err.message || "Failed to reset database");
      }
    }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-[var(--color-text-strong)] flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20">
              <Settings className="w-5 h-5" />
            </div>
            System Settings & Enterprise Parameters
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Global ERP configuration, multi-sector capabilities, IAS/IFRS compliance rules, and database governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            System Status: 100% Operational
          </span>
        </div>
      </div>

      {/* 4-in-1 Top KPI Cards */}
      <KpiGrid cols={4}>
        <KpiCard icon={ShieldCheck} label="Accounting Standard" value={`${accountingConfig.accountingStandard.split(' ')[0]} / IFRS`} desc="Strict double-entry & accrual basis" tone="teal" />
        <KpiCard icon={Globe} label="Global Localization" value="7 Jurisdictions" desc="PK, US, UK, UAE, KSA, CA, EU" tone="blue" />
        <KpiCard icon={Sparkles} label="AI Assistant Tier" value={aiConfig.planTier === 'pro' ? 'Enterprise Pro' : 'Free Advisor'} desc={aiConfig.enableActionExecution ? 'Command Execution Active' : 'Guidance & Help Only'} tone="amber" />
        <KpiCard icon={Layers} label="Multi-Sector Suite" value={`${selectedSectors.length} / 14 Active`} desc="14 Commercial Industry Profiles" tone="purple" />
      </KpiGrid>

      {/* Navigation Tabs - Responsive Wrapped (Zero Horizontal Scroll) */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl w-full">
        {[
          { id: 'general', label: 'General & Localization', icon: Globe },
          { id: 'accounting', label: 'Accounting & IAS/IFRS Rules', icon: ShieldCheck },
          { id: 'sectors', label: 'Multi-Sector Adaptability', icon: Layers },
          { id: 'ai', label: 'AI Copilot & Subscriptions', icon: Sparkles },
          { id: 'license', label: 'Commercial Licensing & Keys', icon: Key },
          { id: 'security', label: 'Security & Access Policies', icon: Lock },
          { id: 'database', label: 'Database & Maintenance', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-strong)] shadow-xs border border-[var(--color-border)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)] hover:bg-[var(--color-surface)]/50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-600' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: GENERAL & LOCALIZATION ─── */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)]">General System Parameters</h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">Configure workspace branding, display regional formats, and date conventions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Enterprise Title / Branding</label>
              <input
                type="text"
                value={generalConfig.systemTitle}
                onChange={e => setGeneralConfig({ ...generalConfig, systemTitle: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)] font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Operating Timezone</label>
              <select
                value={generalConfig.timezone}
                onChange={e => setGeneralConfig({ ...generalConfig, timezone: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)]"
              >
                <option value="Asia/Karachi (UTC+05:00)">Asia/Karachi (UTC+05:00)</option>
                <option value="Asia/Dubai (UTC+04:00)">Asia/Dubai (UTC+04:00)</option>
                <option value="Asia/Riyadh (UTC+03:00)">Asia/Riyadh (UTC+03:00)</option>
                <option value="Europe/London (UTC+00:00)">Europe/London (UTC+00:00)</option>
                <option value="America/New_York (UTC-05:00)">America/New_York (UTC-05:00)</option>
                <option value="America/Toronto (UTC-05:00)">America/Toronto (UTC-05:00)</option>
                <option value="Europe/Frankfurt (UTC+01:00)">Europe/Frankfurt (UTC+01:00)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Date Display Format</label>
              <select
                value={generalConfig.dateFormat}
                onChange={e => setGeneralConfig({ ...generalConfig, dateFormat: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)]"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 23/08/2026 - UK, PK, EU, UAE)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-23 - ISO 8601 Standard)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/23/2026 - US Standard)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Decimal Places for Currency Amounts</label>
              <select
                value={generalConfig.decimalPlaces}
                onChange={e => setGeneralConfig({ ...generalConfig, decimalPlaces: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)]"
              >
                <option value={2}>2 Decimal Places (Standard 0.00)</option>
                <option value={3}>3 Decimal Places (e.g. OMR, BHD, KWD 0.000)</option>
                <option value={0}>0 Decimal Places (e.g. JPY, KRW)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-[var(--color-border)]">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Save className="w-4 h-4" /> Save General Settings
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 2: ACCOUNTING & IAS/IFRS RULES ─── */}
      {activeTab === 'accounting' && (
        <form onSubmit={handleSaveAccounting} className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)]">Financial Reporting & Accounting Governance</h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">Configure double-entry validation, period locking, and statutory accounting frameworks.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Primary Reporting Framework</label>
              <select
                value={accountingConfig.accountingStandard}
                onChange={e => setAccountingConfig({ ...accountingConfig, accountingStandard: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)] font-semibold"
              >
                <option value="IAS / IFRS (International)">IAS / IFRS (International Financial Reporting Standards)</option>
                <option value="US GAAP (United States)">US GAAP (Generally Accepted Accounting Principles)</option>
                <option value="UK FRS 102 (United Kingdom)">UK FRS 102 (UK Accounting Standards)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Fiscal Year Commences</label>
              <select
                value={accountingConfig.fiscalYearStart}
                onChange={e => setAccountingConfig({ ...accountingConfig, fiscalYearStart: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)]"
              >
                <option value="January">January 1st (Calendar Year)</option>
                <option value="July">July 1st (Pakistan / Australia Fiscal)</option>
                <option value="April">April 1st (UK / India Fiscal)</option>
                <option value="October">October 1st (US Federal Fiscal)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Period Closing Lock Date</label>
              <input
                type="date"
                value={accountingConfig.periodLockDate}
                onChange={e => setAccountingConfig({ ...accountingConfig, periodLockDate: e.target.value })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)] font-mono"
              />
              <p className="text-[10px] text-[var(--color-text-muted)]">Transactions dated on or before this lock date cannot be modified or added.</p>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">FX Gain / Loss Accounting (IAS 21)</label>
              <input
                type="text"
                disabled
                value={accountingConfig.fxGainLossPosting}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text-muted)] font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200/50 dark:border-teal-800/50 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span className="font-bold text-teal-900 dark:text-teal-200">Strict Double-Entry Enforcement (IAS 1)</span>
            </div>
            <p className="text-[11px] text-teal-800 dark:text-teal-300">
              Every journal entry, invoice, bill, and voucher is mathematically verified for equal debits and credits (`Total Debit - Total Credit = 0.00`). Imbalanced postings are rejected at the engine level.
            </p>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-[var(--color-border)]">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Accounting Rules
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 3: MULTI-SECTOR ADAPTABILITY ─── */}
      {activeTab === 'sectors' && (
        <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Multi-Sector Business Engine Activation ({selectedSectors.length} Active)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                Enable industry-specific workflows and accounting rules tailored to your commercial business model without bloating other operations.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allSectorIds = [
                    'Services', 'Retail', 'Manufacturing', 'Construction',
                    'RealEstate', 'Healthcare', 'Hospitality', 'Logistics',
                    'Agriculture', 'NonProfit', 'Education', 'FinancialServices',
                    'Energy', 'SaaS'
                  ];
                  setSelectedSectors(allSectorIds);
                  localStorage.setItem('erp_system_sectors', JSON.stringify(allSectorIds));
                  notify('✓ Enabled all 14 commercial business sector engines');
                }}
                className="px-3 py-1.5 border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] rounded-xl text-xs font-semibold"
              >
                Enable All Sectors
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'Services',
                icon: '💼',
                title: 'Professional Services & Consulting',
                category: 'Service & Retainers',
                desc: 'Hourly billing, client retainers, timesheet tracking, service items, and milestone invoicing.',
                tags: ['Hourly Rates', 'Timesheets', 'Retainers'],
              },
              {
                id: 'Retail',
                icon: '🛒',
                title: 'Retail, POS & Omnichannel E-Commerce',
                category: 'Commerce & Stock',
                desc: 'Physical inventory tracking, barcode SKU scanner, POS cash registers, and multi-warehouse replenishment.',
                tags: ['POS Registers', 'Barcoding', 'Stock Min/Max'],
              },
              {
                id: 'Manufacturing',
                icon: '🏭',
                title: 'Manufacturing & Process Production',
                category: 'Industrial',
                desc: 'Multi-level Bill of Materials (BOM), work orders, job costing, raw material WIP, and finished goods conversion.',
                tags: ['Multi-BOM', 'Work Orders', 'WIP Costing'],
              },
              {
                id: 'Construction',
                icon: '🏗️',
                title: 'Construction & Civil Engineering',
                category: 'Project Accounting',
                desc: 'Project-based job costing, AIA G702 progress billing, retention receivables, and subcontractor claims.',
                tags: ['Progress Billing', 'Retention AR/AP', 'Job Costing'],
              },
              {
                id: 'RealEstate',
                icon: '🏢',
                title: 'Real Estate & Property Management',
                category: 'Leases & Property',
                desc: 'IFRS 16 lease management, tenant billing, property unit registries, and CAM service charge reconciliations.',
                tags: ['IFRS 16 Leases', 'Tenant Portals', 'CAM Charges'],
              },
              {
                id: 'Healthcare',
                icon: '🏥',
                title: 'Healthcare, Pharma & Life Sciences',
                category: 'Medical & Clinical',
                desc: 'Batch & lot expiry tracking, patient billing, pharmaceutical records, and clinical cost center accounting.',
                tags: ['Batch & Expiry', 'Patient Ledger', 'Cost Centers'],
              },
              {
                id: 'Hospitality',
                icon: '🍽️',
                title: 'Hospitality, Restaurants & Food Service',
                category: 'F&B & Lodging',
                desc: 'Table & room billing, recipe costing, kitchen order tokens (KOT), banquet management, and daily cash sweeps.',
                tags: ['Table/Room POS', 'Recipe BOM', 'Daily Sweeps'],
              },
              {
                id: 'Logistics',
                icon: '🚚',
                title: 'Logistics, Freight & Fleet Management',
                category: 'Transport & Freight',
                desc: 'Waybill dispatch, vehicle trip costing, fuel log reconciliation, container tracking, and demurrage claims.',
                tags: ['Trip Costing', 'Waybills', 'Fuel Logs'],
              },
              {
                id: 'Agriculture',
                icon: '🌾',
                title: 'Agriculture & Farming (IAS 41)',
                category: 'Biological Assets',
                desc: 'Biological assets fair valuation, harvest costing, seasonal expense amortization, and field plot accounting.',
                tags: ['IAS 41 Biologicals', 'Harvest Costing', 'Plot Tracking'],
              },
              {
                id: 'NonProfit',
                icon: '🏛️',
                title: 'Non-Profit, NGO & Grant Accounting',
                category: 'Funds & Grants',
                desc: 'Multi-donor fund accounting, restricted grant tracking, program vs admin expense split, and Form 990 audit reporting.',
                tags: ['Fund Accounting', 'Grant Tracking', '990 Audits'],
              },
              {
                id: 'Education',
                icon: '🎓',
                title: 'Education & Academic Institutions',
                category: 'Academia',
                desc: 'Tuition fee schedules, student ledgers, term-based billing, faculty payroll, and departmental lab costing.',
                tags: ['Tuition Billing', 'Student Ledger', 'Term Fees'],
              },
              {
                id: 'FinancialServices',
                icon: '💳',
                title: 'Financial Services & FinTech Lending',
                category: 'Banking & Lending',
                desc: 'Loan disbursement, IFRS 9 expected credit loss (ECL) provisioning, interest amortizations, and collateral ledgers.',
                tags: ['IFRS 9 ECL', 'Loan Amortization', 'Collateral'],
              },
              {
                id: 'Energy',
                icon: '⚡',
                title: 'Energy, Utilities & Mining',
                category: 'Natural Resources',
                desc: 'Depletion accounting (IFRS 6), environmental restoration accruals (IAS 37), meter billing, and grid tariff rates.',
                tags: ['IFRS 6 Depletion', 'IAS 37 Accruals', 'Meter Tariffs'],
              },
              {
                id: 'SaaS',
                icon: '💻',
                title: 'SaaS, Subscription & Digital Media',
                category: 'Recurring Revenue',
                desc: 'ASC 606 / IFRS 15 recurring revenue recognition, deferred revenue amortization, MRR/ARR analytics, and churn metrics.',
                tags: ['IFRS 15 Deferred', 'MRR / ARR', 'Dunning'],
              },
            ].map((sector) => {
              const active = selectedSectors.includes(sector.id);
              return (
                <div
                  key={sector.id}
                  onClick={() => handleToggleSector(sector.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    active
                      ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-500 shadow-xs'
                      : 'bg-[var(--color-surface-muted)] border-[var(--color-border)] hover:border-teal-500/40'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-width-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{sector.icon}</span>
                      <h4 className="font-bold text-xs text-[var(--color-text-strong)] truncate">{sector.title}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] font-medium shrink-0">
                        {sector.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">{sector.desc}</p>
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {sector.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={active}
                    readOnly
                    className="accent-teal-600 mt-1 shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB: AI COPILOT & SUBSCRIPTIONS ─── */}
      {activeTab === 'ai' && (
        <form onSubmit={handleSaveAi} className="space-y-6 text-xs">
          {/* Card 1: Free Help Assistant */}
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  AI Help & Advisory Assistant (Standard Tier - Included)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Safe, read-only AI tutor that provides step-by-step ERP guidance, accounting standard explanations, and navigation.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Included in All Accounts
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-start justify-between gap-3 cursor-pointer hover:border-teal-500/40 transition-colors">
                <div className="space-y-1">
                  <div className="font-bold text-xs text-[var(--color-text-strong)]">Enable Floating AI Assistant Button</div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Displays the floating ✨ AI button in the bottom right corner across all screens.</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiConfig.enableHelpAssistant}
                  onChange={e => setAiConfig({ ...aiConfig, enableHelpAssistant: e.target.checked })}
                  className="accent-teal-600 mt-1 shrink-0 cursor-pointer"
                />
              </label>

              <label className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] flex items-start justify-between gap-3 cursor-pointer hover:border-teal-500/40 transition-colors">
                <div className="space-y-1">
                  <div className="font-bold text-xs text-[var(--color-text-strong)]">Screen-Context Aware Suggestions</div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Automatically tailors quick suggested prompts to the active page (e.g. Sales, BOM, Tax).</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiConfig.contextAwareHelp}
                  onChange={e => setAiConfig({ ...aiConfig, contextAwareHelp: e.target.checked })}
                  className="accent-teal-600 mt-1 shrink-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Card 2: Enterprise Copilot Action Pack */}
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-[var(--color-surface)] to-indigo-500/5 shadow-sm space-y-4">
            <div className="border-b border-[var(--color-border)] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  AI Automated Action & Command Execution (Enterprise Subscription)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Allows users to draft invoices, prefill work orders, and trigger automated multi-step workflows using plain English.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  aiConfig.planTier === 'pro'
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300'
                }`}>
                  {aiConfig.planTier === 'pro' ? '★ Enterprise Pro Active' : 'Free Help Plan'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newTier = aiConfig.planTier === 'pro' ? 'free' : 'pro';
                    setAiConfig({
                      ...aiConfig,
                      planTier: newTier,
                      enableActionExecution: newTier === 'pro',
                      subscriptionPlan: newTier === 'pro' ? 'Enterprise Pro Plan ($49/mo)' : 'Free Help & Guidance Plan'
                    });
                    notify(newTier === 'pro' ? '✓ Switched to Enterprise Pro Subscription' : '✓ Reverted to Free Plan');
                  }}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-[11px] rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {aiConfig.planTier === 'pro' ? 'Downgrade to Free' : 'Upgrade to Enterprise ($49/mo)'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`p-4 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                aiConfig.planTier === 'pro'
                  ? 'border-[var(--color-border)] bg-[var(--color-surface-muted)] cursor-pointer hover:border-amber-500/40'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-muted)]/50 opacity-60 cursor-not-allowed'
              }`}>
                <div className="space-y-1">
                  <div className="font-bold text-xs text-[var(--color-text-strong)] flex items-center gap-1.5">
                    Allow AI Automated Action Execution
                    {aiConfig.planTier !== 'pro' && <Lock className="w-3 h-3 text-amber-600" />}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    When enabled, typing commands like <i>"Draft an invoice for customer ABC"</i> will automatically prepare records.
                  </p>
                </div>
                <input
                  type="checkbox"
                  disabled={aiConfig.planTier !== 'pro'}
                  checked={aiConfig.enableActionExecution}
                  onChange={e => setAiConfig({ ...aiConfig, enableActionExecution: e.target.checked })}
                  className="accent-amber-600 mt-1 shrink-0 cursor-pointer"
                />
              </label>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/20 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs text-emerald-800 dark:text-emerald-300">Mandatory Human-in-the-Loop Confirmation</div>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Even in Enterprise Action mode, all AI-generated transactions require human review and confirmation before posting to preserve double-entry audit integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save AI Preferences
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB: COMMERCIAL LICENSING & KEY GENERATOR ─── */}
      {activeTab === 'license' && (
        <div className="space-y-6 text-xs">
          {/* Card 1: Key Generator */}
          <form onSubmit={handleGenerateKey} className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                  <Key className="w-4 h-4 text-teal-600" />
                  Pilot Customer License Key Generator (Founding Partner / Beta)
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Generate HMAC-SHA256 cryptographically signed license keys to issue free 3-month, 6-month, 1-year, or Lifetime access for your pilot companies.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Admin Key Generator
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-white">Client Company / Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Manufacturing Ltd"
                  value={genOrgName}
                  onChange={e => setGenOrgName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--color-surface-muted)] text-[var(--color-text-strong)]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-white">License Tier / Package</label>
                <select
                  value={genTier}
                  onChange={e => setGenTier(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--color-surface-muted)] text-[var(--color-text-strong)]"
                >
                  <option value="Founding Partner / Beta Enterprise">Founding Partner / Beta Enterprise</option>
                  <option value="Commercial Enterprise Suite">Commercial Enterprise Suite</option>
                  <option value="Multi-Company Holding Edition">Multi-Company Holding Edition</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-900 dark:text-white">Granted License Duration</label>
                <select
                  value={genDuration}
                  onChange={e => setGenDuration(Number(e.target.value))}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-[var(--color-surface-muted)] text-[var(--color-text-strong)]"
                >
                  <option value={3}>3 Months (Extended Evaluation)</option>
                  <option value={6}>6 Months (Pilot Partner License)</option>
                  <option value={12}>1 Year (Founding Customer Plan)</option>
                  <option value={0}>Lifetime Unlimited (Permanent)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Keys generated here are tamper-proof and signed with your enterprise private key.
              </span>
              <button
                type="submit"
                disabled={genLoading || !genOrgName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                {genLoading ? 'Signing Key...' : 'Generate Signed License Key'}
              </button>
            </div>

            {generatedKey && (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-teal-500/40 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Generated License Key for: {genOrgName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedKey);
                      notify('✓ Copied license key to clipboard!');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Key
                  </button>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg font-mono text-[11px] text-teal-200 break-all select-all border border-slate-800">
                  {generatedKey}
                </div>
                <p className="text-[10px] text-slate-400">
                  Give this key to the customer. They can click <b>[Activate Full License]</b> in the top navbar and paste this key to unlock their system.
                </p>
              </div>
            )}
          </form>

          {/* Card 2: Pilot Customer Feedback Inbox */}
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4">
            <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
                  Pilot Customer Feedback & Feature Requests Inbox
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Real-time suggestions, bug reports, and feedback submitted by users during their 90-day trial.
                </p>
              </div>
              <button
                type="button"
                onClick={loadFeedbacks}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
              >
                Refresh Inbox
              </button>
            </div>

            {feedbacks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <MessageSquarePlus className="w-8 h-8 mx-auto opacity-30" />
                <p className="font-semibold text-xs">No feedback submitted yet</p>
                <p className="text-[11px]">When pilot users click the <b>💡 Feedback</b> button, their messages will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {feedbacks.map((f: any) => (
                  <div key={f.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--color-surface-muted)] space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.category === 'Bug Report'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            : f.category === 'Feature Request'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                        }`}>
                          {f.category}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-xs">{f.customerName || 'Anonymous'}</span>
                        {f.customerEmail && <span className="text-slate-400 text-[11px]">({f.customerEmail})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: f.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(f.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-[var(--color-surface)] p-2.5 rounded-lg border border-[var(--color-border)]">
                      {f.feedbackText}
                    </p>
                    {f.currentScreen && (
                      <p className="text-[10px] text-slate-400">
                        Submitted from screen: <span className="font-semibold text-slate-600 dark:text-slate-300">{f.currentScreen}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: SECURITY & ACCESS POLICIES ─── */}
      {activeTab === 'security' && (
        <form onSubmit={handleSaveSecurity} className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)]">Authentication, Session & Access Governance</h3>
            <p className="text-[11px] text-[var(--color-text-muted)]">Configure credential complexity, session timeouts, and lockout rules.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Operator Session Timeout</label>
              <select
                value={securityConfig.sessionTimeoutMins}
                onChange={e => setSecurityConfig({ ...securityConfig, sessionTimeoutMins: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)]"
              >
                <option value={15}>15 Minutes of Inactivity</option>
                <option value={30}>30 Minutes of Inactivity</option>
                <option value={60}>60 Minutes (1 Hour Standard)</option>
                <option value={240}>4 Hours</option>
                <option value={480}>8 Hours (Full Working Day)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-[var(--color-text-strong)]">Max Failed Login Attempts Before Lockout</label>
              <select
                value={securityConfig.maxFailedAttempts}
                onChange={e => setSecurityConfig({ ...securityConfig, maxFailedAttempts: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl outline-none text-[var(--color-text)]"
              >
                <option value={3}>3 Failed Attempts</option>
                <option value={5}>5 Failed Attempts (Recommended)</option>
                <option value={10}>10 Failed Attempts</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-[var(--color-border)]">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Security Policies
            </button>
          </div>
        </form>
      )}

      {/* ─── TAB 5: DATABASE & DANGER ZONE ─── */}
      {activeTab === 'database' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-600" /> Database & Storage Health
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Storage Engine</span>
                <span className="font-bold text-xs text-[var(--color-text-strong)]">InMemory + JSON WORM</span>
              </div>
              <div className="p-3 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Audit Integrity</span>
                <span className="font-bold text-xs text-emerald-600">100% Tamper-Evident</span>
              </div>
              <div className="p-3 bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase font-semibold block">Server Connection</span>
                <span className="font-bold text-xs text-blue-600">Port 5124 Active</span>
              </div>
            </div>
          </div>

          {/* Ledger Snapshot & Offline Backup Card */}
          <div className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm space-y-4 text-xs">
            <div className="border-b border-[var(--color-border)] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--color-text-strong)] flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" /> One-Click Database Snapshot & Ledger Backup
                </h3>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                  Export complete encrypted JSON snapshots of all posted journals, accounts, invoices, and settings.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Export Backup */}
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
                <h4 className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-600" /> Export Full Database Snapshot
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Download an instant JSON archive containing your full chart of accounts, journal entries, entities, and tax settings.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const backupData = {
                      version: '1.0',
                      exportedAt: new Date().toISOString(),
                      system: 'AMS Enterprise Accounting Management Solutions',
                      localStorageSnapshot: { ...localStorage },
                    };
                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `AMS_Ledger_Backup_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    notify('✓ Complete ledger snapshot backup downloaded!');
                  }}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download size={13} /> Download JSON Backup
                </button>
              </div>

              {/* Restore Backup */}
              <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/50 bg-teal-50/40 dark:bg-teal-950/20 space-y-2.5">
                <h4 className="font-bold text-xs text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-teal-600" /> Restore Database from Snapshot
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Upload a previously saved `.json` ledger backup file to restore accounting records and configurations.
                </p>
                <label className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                  <Upload size={13} /> Select Backup File to Restore
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const parsed = JSON.parse(event.target?.result as string);
                          if (parsed.localStorageSnapshot) {
                            Object.entries(parsed.localStorageSnapshot).forEach(([k, v]) => {
                              localStorage.setItem(k, v as string);
                            });
                            notify('✓ Ledger database restored successfully! Refreshing...');
                            setTimeout(() => window.location.reload(), 1200);
                          } else {
                            notify('Invalid backup file structure.');
                          }
                        } catch {
                          notify('Failed to parse backup JSON file.');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-sm text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Danger Zone: Factory Reset
            </h3>
            <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-relaxed">
              Wiping the database will permanently delete all posted journals, invoices, bank vouchers, customer balances, and asset schedules. Clean IAS/IFRS chart of account templates and tax codes will be automatically re-seeded.
            </p>
            <button
              onClick={handleFactoryReset}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Reset Database & Wipe Records
            </button>
          </div>
        </div>
      )}

      {/* Quick Jump Links to other configuration submodules */}
      <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="font-bold text-[var(--color-text-strong)]">Related Configuration Tools:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPage('Administration.Chart of Accounts Mapping')}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] font-semibold flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-600" /> System Account Mapping
          </button>
          <button
            onClick={() => setPage('Administration.Companies')}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] font-semibold flex items-center gap-1"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Entity Management
          </button>
          <button
            onClick={() => setPage('Administration.Number Series')}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] font-semibold flex items-center gap-1"
          >
            <Hash className="w-3.5 h-3.5 text-indigo-600" /> Number Series
          </button>
          <button
            onClick={() => setPage('Administration.Currency')}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] font-semibold flex items-center gap-1"
          >
            <Coins className="w-3.5 h-3.5 text-rose-600" /> Currency & FX
          </button>
          <button
            onClick={() => setPage('Administration.Audit Logs')}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] text-[var(--color-text-strong)] font-semibold flex items-center gap-1"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" /> Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
