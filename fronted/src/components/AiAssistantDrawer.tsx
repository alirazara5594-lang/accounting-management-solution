import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, X, Send, Bot, User,
  Lightbulb, Compass, ShieldAlert,
  ArrowRight, MessageSquarePlus, HelpCircle
} from 'lucide-react';

interface AiAssistantDrawerProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onOpenFeedback?: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedActions?: { label: string; page?: string; actionType?: string }[];
  isProPrompt?: boolean;
}

// Module-specific quick suggestion questions
const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  'Sales': [
    'How do I create and post a multi-currency Sales Invoice?',
    'How does automated inventory deduction work on invoice?',
    'How do I issue a Credit Note against an invoice?',
    'Where can I see customer aging buckets and overdue balances?'
  ],
  'Procurement': [
    'How does the 3-Way Matching (PO vs GRN vs Bill) work?',
    'How do I record a Goods Receipt Note (GRN) with GRNI accrual?',
    'Where do I allocate bill line items to Fixed Assets or WIP?',
    'How do I process an employee expense claim reimbursement?'
  ],
  'Banking': [
    'How do I reconcile my bank statement against the General Ledger?',
    'What are the 5 types of Vouchers (BPV, BRV, CPV, CRV, JV)?',
    'How do I record an inter-account fund transfer?',
    'Where can I view the Direct & Indirect Cash Flow Statements?'
  ],
  'Accounting': [
    'How does Double-Entry bookkeeping work in this ERP?',
    'How do I record a Right-of-Use Asset and Lease under IFRS 16?',
    'How do I execute a monthly Depreciation batch run?',
    'How does Period Closing prevent backdated journal entries?'
  ],
  'Assets': [
    'What is the formula for Straight-Line vs Declining Balance depreciation?',
    'How is Moving Average Cost calculated for inventory stock?',
    'How do I perform a stock transfer between warehouses?',
    'Where do I view asset net book values and accumulated depreciation?'
  ],
  'Manufacturing': [
    'How do I create a Multi-Level Bill of Materials (BOM)?',
    'What journal entries are created when a Work Order is started and completed?',
    'How are Direct Labor and Machine Overhead costs absorbed into Finished Goods?',
    'Where can I track WIP (Work In Progress) balances?'
  ],
  'Payroll': [
    'How are statutory tax brackets applied for UK, US, PK, UAE, KSA, EU, and Canada?',
    'What journal entry is posted automatically upon payroll processing?',
    'How do I generate and print employee salary slips?',
    'How do loan advances and salary deductions work?'
  ],
  'Compliance': [
    'What are the VAT rates and rules for UK, EU, UAE, KSA, Pakistan, and Canada?',
    'How does ZATCA (KSA) and FBR (Pakistan) E-Invoicing clearance work?',
    'How do I generate and file periodic VAT/Sales Tax returns?',
    'Where do I issue Withholding Tax (WHT) certificates?'
  ],
  'Projects': [
    'How do I track billable timesheets and project expenses?',
    'How do I generate a Progress Billing invoice for a client project?',
    'How is project gross profit and margin calculated in real time?',
    'Where do I define project phases and budget limits?'
  ],
  'Administration': [
    'How do I configure System Account Mapping for automated journals?',
    'How do I set up Role-Based Permissions for staff members?',
    'How do I enable the AI Action Execution Enterprise Subscription?',
    'Where can I review immutable audit logs and user activity?'
  ]
};

// Knowledge base responses for typical user questions
const KNOWLEDGE_BASE: { keywords: string[]; answer: string; targetPage?: string; actions?: { label: string; page: string }[] }[] = [
  {
    keywords: ['create invoice', 'new invoice', 'sales invoice', 'bill customer'],
    answer: `To create and post a Sales Invoice:\n\n1. Navigate to **Sales & Customers → Sales Invoices**.\n2. Click the **＋ New Invoice** button in the header.\n3. Select a Customer, invoice date, due date, and add line items (Products or Services).\n4. Specify quantity, unit price, and optional tax codes.\n5. Click **Save Draft** or **Post Invoice**.\n\n*Accounting Note:* When posted, the system records: **Dr Accounts Receivable / Cr Sales Revenue & Cr Tax Payable**, and automatically deducts physical stock for inventory items.`,
    targetPage: 'Sales & Customers.Sales Invoices',
    actions: [{ label: 'Go to Sales Invoices', page: 'Sales & Customers.Sales Invoices' }]
  },
  {
    keywords: ['3-way match', 'three way match', 'purchase order', 'grn', 'goods receipt'],
    answer: `**3-Way Matching (PO vs GRN vs Vendor Bill):**\n\n1. **Purchase Order (PO):** Created under Procurement with agreed quantities and prices.\n2. **Goods Receipt Note (GRN):** When goods arrive at the warehouse, a GRN is created (posts *Dr Inventory Asset / Cr GRNI Accrual*).\n3. **Vendor Bill:** When the invoice arrives from the vendor, match it against the PO and GRN.\n4. The system validates that $|\text{PO Qty} - \text{GRN Qty}| = 0$ and $|\text{PO Cost} - \text{Bill Cost}| = 0$. If variance exists, a warning banner is raised.`,
    targetPage: 'Procurement.Bills',
    actions: [{ label: 'Go to Vendor Bills', page: 'Procurement.Bills' }, { label: 'Procurement Workspace', page: 'Procurement.Procurement Workspace' }]
  },
  {
    keywords: ['depreciation', 'straight line', 'declining balance', 'asset schedule'],
    answer: `**Fixed Asset Depreciation Methods:**\n\n• **Straight-Line:**\n$$\\text{Monthly Depr} = \\frac{\\text{Cost} - \\text{Salvage Value}}{\\text{Useful Life (Years)} \\times 12}$$\n• **Declining Balance (150%):**\n$$\\text{Monthly Depr} = \\frac{\\text{Net Book Value} \\times (1.5 / \\text{Useful Life})}{12}$$\n\n**Posting:** Go to **Assets & Inventory → Depreciation Run** and click **Run Batch Depreciation** to post: *Dr Depreciation Expense (or MOH) / Cr Accumulated Depreciation*.`,
    targetPage: 'Assets & Inventory.Depreciation Run',
    actions: [{ label: 'Open Depreciation Run', page: 'Assets & Inventory.Depreciation Run' }]
  },
  {
    keywords: ['reconcile', 'bank reconciliation', 'reconciliation', 'bank statement'],
    answer: `**Bank Reconciliation Workflow:**\n\n1. Navigate to **Banking & Payments → Bank Reconciliation**.\n2. Select your Bank Account and statement date.\n3. Enter the Ending Balance from your official bank statement.\n4. The system automatically fetches your General Ledger cash/bank balance and computes the **Unreconciled Difference**.\n5. Match outstanding deposits and disbursements until Difference is zero, then click **Complete Reconciliation**.`,
    targetPage: 'Banking & Payments.Bank Reconciliation',
    actions: [{ label: 'Open Bank Reconciliation', page: 'Banking & Payments.Bank Reconciliation' }]
  },
  {
    keywords: ['payroll', 'salary', 'tax slab', 'payrun', 'salary slip'],
    answer: `**Payroll Processing & GL Posting:**\n\n1. Navigate to **Payroll & HR → Payroll**.\n2. Click **Start New Payrun** $\\rightarrow$ Select pay period and employees.\n3. The system computes basic salary, taxable allowances, social security (EOBI/PF), and country-specific tax slabs.\n4. Upon posting, it records: *Dr Salary Expense & Employer Contrib / Cr Net Pay Payable, Tax Accrued, & Social Security Accrued*.\n5. Click **Salary** tab to preview or download individual Salary Slip PDFs.`,
    targetPage: 'Payroll & HR.Payroll',
    actions: [{ label: 'Open Payroll Processing', page: 'Payroll & HR.Payroll' }, { label: 'View Salary Slips', page: 'Payroll & HR.Salary' }]
  },
  {
    keywords: ['vat', 'tax', 'sales tax', 'gst', 'zatca', 'fbr', 'einvoice'],
    answer: `**Global Tax & E-Invoicing Compliance:**\n\n• **Supported Markets:** UK (20% VAT), USA (State Sales Tax), Pakistan (18% FBR GST / 16% PRA), UAE (5% VAT), Saudi Arabia (15% ZATCA VAT), Canada (5% GST + Provincial HST), EU (21% standard VAT).\n• **E-Invoicing:** Navigate to **Government Compliance → E-Invoicing** to generate compliant XML/JSON payloads with digital signatures and QR codes for tax authorities (ZATCA, FBR, EU).`,
    targetPage: 'Government Compliance.Tax Management',
    actions: [{ label: 'Tax Management', page: 'Government Compliance.Tax Management' }, { label: 'E-Invoicing View', page: 'Government Compliance.E-Invoicing' }]
  },
  {
    keywords: ['bom', 'bill of materials', 'work order', 'manufacturing', 'job cost'],
    answer: `**Manufacturing & Cost Absorption:**\n\n1. **Bill of Materials (BOM):** Under *Manufacturing → Bill of Materials*, define raw material components and quantities required per 1 unit of finished product.\n2. **Work Order Launch:** Starting a work order issues raw materials (*Dr WIP / Cr Raw Materials*).\n3. **Labor & Overhead Logging:** Track direct labor and machine hours.\n4. **Work Order Completion:** Posts finished goods (*Dr Finished Goods Inventory / Cr WIP, Direct Labor, MOH*).`,
    targetPage: 'Manufacturing & Production.Bill of Materials',
    actions: [{ label: 'Open BOM Workspace', page: 'Manufacturing & Production.Bill of Materials' }, { label: 'Open Work Orders', page: 'Manufacturing & Production.Work Orders' }]
  },
  {
    keywords: ['closing', 'period close', 'lock date', 'year end', 'lock'],
    answer: `**Period Closing & Financial Lock:**\n\n1. Go to **Accounting → Period Closing**.\n2. Select an accounting period (Monthly, Quarterly, or Annual).\n3. Enter the Period Lock Date.\n4. Once locked, the system prevents any user from creating, editing, or deleting backdated transactions prior to that date, ensuring immutable audit compliance (IAS 1 / GAAP).`,
    targetPage: 'Accounting.Period Closing',
    actions: [{ label: 'Open Period Closing', page: 'Accounting.Period Closing' }]
  }
];

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ activePage, onNavigate, onOpenFeedback }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [askMenuOpen, setAskMenuOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    return [
      {
        id: '1',
        sender: 'ai',
        text: `👋 Hello! I am your **AMS Financial & ERP Assistant**.\n\nI can guide you step-by-step through any workflow, explain accounting rules (IAS/IFRS & GAAP), tax compliance (UK, US, PK, UAE, KSA, CA, EU), or help you navigate. How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check subscription setting from localStorage
  const isActionExecutionEnabled = () => {
    try {
      const saved = localStorage.getItem('erp_system_ai');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Boolean(parsed.enableActionExecution);
      }
    } catch {}
    return false;
  };

  const getModuleKey = () => {
    const group = activePage.split('.')[0] || '';
    return Object.keys(CONTEXT_SUGGESTIONS).find(k => group.toLowerCase().includes(k.toLowerCase())) || 'Sales';
  };

  const currentSuggestions = CONTEXT_SUGGESTIONS[getModuleKey()] || CONTEXT_SUGGESTIONS['Sales'];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
      if (e.key === 'Escape' && askMenuOpen) {
        setAskMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages, isOpen, askMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (askMenuOpen && !(e.target as HTMLElement).closest('.ask-menu-container')) {
        setAskMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [askMenuOpen]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      generateAiResponse(query);
    }, 600);
  };

  const generateAiResponse = (userQuery: string) => {
    const qLower = userQuery.toLowerCase();
    const actionEnabled = isActionExecutionEnabled();

    // Check if user is asking to execute an action (e.g., "create invoice for...", "draft a bill...")
    const isActionCommand = qLower.startsWith('create ') || qLower.startsWith('draft ') || qLower.startsWith('post ') || qLower.startsWith('delete ') || qLower.startsWith('execute ');

    if (isActionCommand && !actionEnabled) {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `🔒 **Action Execution is an Enterprise Subscription Feature**\n\nIn the **Free Help & Advisory Tier**, I cannot directly create or modify transactions for your safety.\n\nHowever, I can provide complete step-by-step guidance on how to do this yourself, or your Administrator can enable **AI Action Execution** under **Administration → System Settings → AI Copilot & Subscriptions**.\n\nWould you like me to walk you through doing this manually?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: 'View AI Subscription Settings', page: 'Administration.System Settings' },
          { label: 'Show Step-by-Step Tutorial' }
        ],
        isProPrompt: true
      };
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
      return;
    }

    // Match against knowledge base
    const matched = KNOWLEDGE_BASE.find(k => k.keywords.some(kw => qLower.includes(kw)));

    if (matched) {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: matched.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: matched.actions
      };
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
      return;
    }

    // Contextual fallback response
    let fallbackText = `Here is guidance for **${userQuery}** in AMS ERP:\n\n`;
    if (qLower.includes('how') || qLower.includes('where') || qLower.includes('help')) {
      fallbackText += `1. **Navigation:** You can access all related screens from the sidebar under the **${activePage.split('.')[0]}** module.\n2. **Compliance:** All transactions adhere to double-entry standards (IAS/IFRS) where debits equal credits.\n3. **Reporting:** Once transactions are posted, they immediately update the General Ledger, Balance Sheet, and P&L.\n\nWould you like me to open a specific screen or explain a specific accounting standard?`;
    } else {
      fallbackText += `To handle this in the ERP, ensure your master data (Accounts, Customers/Vendors, Tax Codes) is set up under **Administration**, then proceed through the standard workflow in **${activePage.split('.')[0]}**.\n\nNeed direct assistance with a specific form or calculation? Just ask!`;
    }

    const response: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      text: fallbackText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        { label: `Open ${activePage.split('.')[0]} Dashboard`, page: `${activePage.split('.')[0]}.Summary` },
        { label: 'Open Chart of Accounts', page: 'Accounting.Chart of Accounts' }
      ]
    };
    setMessages(prev => [...prev, response]);
    setIsTyping(false);
  };

  return (
    <>
      {/* Floating Ask Button (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 ask-menu-container">
          <div className="relative">
            {askMenuOpen && (
              <div className="absolute bottom-16 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden w-52 mb-2">
                <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Access</p>
                </div>
                <button
                  onClick={() => { setIsOpen(true); setAskMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/40">
                    <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100">AMS Assistant</p>
                    <p className="text-[10px] text-slate-400">Ask questions & get help</p>
                  </div>
                </button>
                {onOpenFeedback && (
                  <button
                    onClick={() => { onOpenFeedback(); setAskMenuOpen(false); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer border-t border-slate-100 dark:border-slate-700/50"
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                      <MessageSquarePlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Feedback</p>
                      <p className="text-[10px] text-slate-400">Send suggestions & bugs</p>
                    </div>
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => setAskMenuOpen(o => !o)}
              className="flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white rounded-full shadow-2xl transition-all duration-200 transform hover:scale-105 active:scale-95 group border border-white/20 cursor-pointer"
              title="Ask for Help or Feedback"
              style={{ boxShadow: '0 10px 25px -5px rgba(13, 148, 136, 0.4), 0 8px 10px -6px rgba(13, 148, 136, 0.4)' }}
            >
              <div className="relative">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm tracking-wide">Ask</span>
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Drawer / Panel (No Screen Blur) */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[9999] w-full sm:w-[440px] bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 animate-in slide-in-from-right">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-tight text-white">AMS Assistant</h3>
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-200 border border-teal-400/30">
                    {isActionExecutionEnabled() ? 'Pro Action' : 'Help & Guide'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-teal-400" />
                  Viewing: <span className="font-semibold text-white truncate max-w-[180px]">{activePage}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white border border-white/20 transition-all font-bold text-xs cursor-pointer shadow-xs"
              title="Close AMS Assistant (Esc)"
            >
              <span>Close</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Context Suggestion Bar */}
          <div className="bg-[var(--color-bg-subtle,#f8fafc)] border-b border-[var(--color-border,#e2e8f0)] p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted,#64748b)] mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3 h-3 text-amber-500" /> Suggested for this screen:
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {currentSuggestions.slice(0, 3).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(sug)}
                  className="text-[11px] font-medium text-[var(--color-text-strong,#1e293b)] bg-[var(--color-bg-primary,white)] hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-[var(--color-border,#cbd5e1)] rounded-lg px-2.5 py-1 whitespace-nowrap transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-br-none'
                      : msg.isProPrompt
                      ? 'bg-amber-500/10 border border-amber-500/30 text-[var(--color-text-strong,#1e293b)] rounded-bl-none'
                      : 'bg-[var(--color-bg-subtle,#f1f5f9)] text-[var(--color-text-strong,#1e293b)] border border-[var(--color-border,#e2e8f0)] rounded-bl-none'
                  }`}
                >
                  <div className="text-[12.5px] leading-relaxed whitespace-pre-line">
                    {msg.text}
                  </div>

                  {/* Suggested Action Buttons */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 border-t border-[var(--color-border,#e2e8f0)]/40 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (act.page) {
                              onNavigate(act.page);
                              setIsOpen(false);
                            } else {
                              handleSend(`Walk me through step-by-step: ${act.label}`);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-teal-600/10 hover:bg-teal-600 hover:text-white text-teal-700 dark:text-teal-400 border border-teal-600/20 transition-all cursor-pointer"
                        >
                          {act.label}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`text-[10px] ${msg.sender === 'user' ? 'text-teal-100 text-right' : 'text-[var(--color-text-muted,#94a3b8)]'}`}>
                    {msg.timestamp}
                  </div>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2.5 items-center text-[var(--color-text-muted,#64748b)]">
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[var(--color-bg-subtle,#f1f5f9)] p-3 rounded-2xl rounded-bl-none border border-[var(--color-border,#e2e8f0)] flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 border-t border-[var(--color-border,#e2e8f0)] bg-[var(--color-bg-primary,white)] space-y-2">
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask anything about this module, accounting, or rules..."
                value={input}
                onChange={e => setInput(e.target.value)}
                className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-xs transition-colors cursor-pointer"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted,#94a3b8)] px-1">
              <span>Press <b>Enter</b> to send</span>
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-emerald-500" /> IAS / GAAP Compliant Advisor
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
