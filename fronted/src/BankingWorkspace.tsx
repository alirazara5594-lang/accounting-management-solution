import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Building2,
  CheckCircle2,
  Plus,
  Search,
  DollarSign,
  Wallet,
  ArrowLeftRight,
  Link2,
  UploadCloud,
  FileSpreadsheet,
  Building,
  Zap,
  Clock
} from 'lucide-react';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { KpiCard, KpiGrid } from '@/components/ui/kpi-card';
import { CompactSelect } from './components/CompactSelect';
import { getActiveCurrency } from '@/lib/currency';
import type { Entity } from './EntitySettings';

type PaymentMode = 'ACH' | 'Wire Transfer' | 'Cheque / Pay Order' | 'SWIFT' | 'RTGS' | 'Credit Card' | 'Direct Debit' | 'Online Banking';

interface BankAccount {
  id: string;
  code: string;
  name: string;
  bankName: string;
  accountNumber: string;
  iban?: string;
  currency: string;
  type: 'Bank' | 'Cash' | 'CreditCard';
  balance: number;
  lastReconciledDate?: string;
  reconciledStatus: 'Reconciled' | 'Pending' | 'Needs Attention';
  connectionStatus?: 'Connected' | 'Disconnected' | 'Syncing';
}

interface PaymentTransaction {
  id: string;
  date: string;
  reference: string;
  accountName: string;
  counterparty: string;
  description: string;
  type: 'Vendor Payment' | 'Customer Receipt' | 'Inter-Account Transfer' | 'Fee / Charge';
  paymentMode: PaymentMode;
  amount: number;
  currency: string;
  status: 'Completed' | 'Pending Clearance' | 'Processing';
}

interface BankingWorkspaceProps {
  subView?: string;
  activeEntityId: string;
  entities: Entity[];
}

const initialBankAccounts: BankAccount[] = [
  {
    id: 'b1',
    code: '11101',
    name: 'Main Operating Account (HBL)',
    bankName: 'Habib Bank Limited',
    accountNumber: 'PK12HABB00012345678901',
    iban: 'PK12HABB00012345678901',
    currency: 'PKR',
    type: 'Bank',
    balance: 4500000,
    lastReconciledDate: '2026-07-31',
    reconciledStatus: 'Reconciled',
    connectionStatus: 'Connected'
  },
  {
    id: 'b2',
    code: '11102',
    name: 'Islamic Corporate Account (Meezan)',
    bankName: 'Meezan Bank',
    accountNumber: 'PK45MEZN00098765432102',
    iban: 'PK45MEZN00098765432102',
    currency: 'PKR',
    type: 'Bank',
    balance: 1850000,
    lastReconciledDate: '2026-07-28',
    reconciledStatus: 'Pending',
    connectionStatus: 'Syncing'
  },
  {
    id: 'b3',
    code: '11103',
    name: 'Global Trade Account (USD)',
    bankName: 'Standard Chartered',
    accountNumber: 'SCB-USD-992144',
    iban: 'US89SCBL000992144',
    currency: 'USD',
    type: 'Bank',
    balance: 62500,
    lastReconciledDate: '2026-08-01',
    reconciledStatus: 'Reconciled',
    connectionStatus: 'Connected'
  },
  {
    id: 'c1',
    code: '11104',
    name: 'Head Office Petty Cash Vault',
    bankName: 'Internal Physical Cash Vault',
    accountNumber: 'CASH-HO-01',
    currency: 'PKR',
    type: 'Cash',
    balance: 125000,
    lastReconciledDate: '2026-08-08',
    reconciledStatus: 'Reconciled'
  }
];

const initialTransactions: PaymentTransaction[] = [
  {
    id: 'tx-1',
    date: '2026-08-09',
    reference: 'PAY-8841',
    accountName: 'Main Operating Account (HBL)',
    counterparty: 'Allied Engineering Supplies',
    description: 'Vendor Bill Payment for Spare Parts Batch #44',
    type: 'Vendor Payment',
    paymentMode: 'Wire Transfer',
    amount: -450000,
    currency: 'PKR',
    status: 'Completed'
  },
  {
    id: 'tx-2',
    date: '2026-08-08',
    reference: 'REC-1092',
    accountName: 'Global Trade Account (USD)',
    counterparty: 'Apex Global Logistics USA',
    description: 'Customer Invoice Settlement #INV-209',
    type: 'Customer Receipt',
    paymentMode: 'ACH',
    amount: 14800,
    currency: 'USD',
    status: 'Completed'
  },
  {
    id: 'tx-3',
    date: '2026-08-07',
    reference: 'TRF-3301',
    accountName: 'Main Operating Account (HBL)',
    counterparty: 'Islamic Corporate Account (Meezan)',
    description: 'Inter-bank liquidity balancing transfer',
    type: 'Inter-Account Transfer',
    paymentMode: 'RTGS',
    amount: -250000,
    currency: 'PKR',
    status: 'Completed'
  },
  {
    id: 'tx-4',
    date: '2026-08-06',
    reference: 'PAY-8830',
    accountName: 'Global Trade Account (USD)',
    counterparty: 'Cloud Infrastructure Corp',
    description: 'Monthly SaaS Hosting Fees',
    type: 'Vendor Payment',
    paymentMode: 'Credit Card',
    amount: -1250,
    currency: 'USD',
    status: 'Completed'
  }
];

const mapSubViewToTab = (subView?: string) => {
  if (!subView) return 'bank-accounts';
  const lower = subView.toLowerCase();
  if (lower.includes('cash account')) return 'cash-accounts';
  if (lower.includes('connection')) return 'bank-connection';
  if (lower.includes('import')) return 'bank-import';
  if (lower.includes('transaction')) return 'transactions';
  if (lower.includes('reconciliation')) return 'reconciliation';
  if (lower.includes('vendor payment')) return 'vendor-payments';
  if (lower.includes('customer receipt')) return 'customer-receipts';
  if (lower.includes('fund transfer') || lower.includes('transfer')) return 'fund-transfers';
  if (lower.includes('cash flow')) return 'cash-flow';
  return 'bank-accounts';
};

export const BankingWorkspace: React.FC<BankingWorkspaceProps> = ({ subView, activeEntityId, entities }) => {
  const currentEntity = entities.find(e => e.id === activeEntityId);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(initialBankAccounts);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(initialTransactions);
  const [activeTab, setActiveTab] = useState<string>(() => mapSubViewToTab(subView));

  React.useEffect(() => {
    setActiveTab(mapSubViewToTab(subView));
  }, [subView]);
  const [query, setQuery] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isNewBankModalOpen, setIsNewBankModalOpen] = useState(false);
  const [isConnectBankModalOpen, setIsConnectBankModalOpen] = useState(false);

  // New Vendor Payment / Customer Receipt Modal State
  const [isNewPaymentModalOpen, setIsNewPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    type: 'Vendor Payment' as 'Vendor Payment' | 'Customer Receipt',
    bankAccountId: initialBankAccounts[0].id,
    counterparty: '',
    amount: '',
    paymentMode: 'Wire Transfer' as PaymentMode,
    reference: 'PAY-00001',
    description: ''
  });

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    sourceAccountId: initialBankAccounts[0].id,
    targetAccountId: initialBankAccounts[1].id,
    amount: '',
    paymentMode: 'RTGS' as PaymentMode,
    exchangeRate: '1.0',
    reference: 'TRF-00001',
    description: 'Inter-account fund transfer'
  });

  // New Bank Account Form State
  const [newBankForm, setNewBankForm] = useState({
    code: '11105',
    name: '',
    bankName: '',
    accountNumber: '',
    iban: '',
    currency: 'USD',
    type: 'Bank' as 'Bank' | 'Cash' | 'CreditCard',
    openingBalance: '0'
  });

  // Reconciliation State
  const [reconAccountId, setReconAccountId] = useState(initialBankAccounts[0].id);
  const [statementBalance, setStatementBalance] = useState('4500000');
  const selectedReconAccount = bankAccounts.find(b => b.id === reconAccountId) || bankAccounts[0];

const formatMoney = (amount: number, curr?: string) => {
const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: curr || getActiveCurrency(), maximumFractionDigits: 2 }).format(Math.abs(amount));
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid transfer amount.');
      return;
    }

    const src = bankAccounts.find(b => b.id === transferForm.sourceAccountId);
    const tgt = bankAccounts.find(b => b.id === transferForm.targetAccountId);

    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === transferForm.sourceAccountId) {
        return { ...acc, balance: acc.balance - amt };
      }
      if (acc.id === transferForm.targetAccountId) {
        return { ...acc, balance: acc.balance + (amt * parseFloat(transferForm.exchangeRate || '1')) };
      }
      return acc;
    }));

    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      reference: transferForm.reference,
      accountName: src?.name || 'Bank Account',
      counterparty: tgt?.name || 'Target Account',
      description: transferForm.description || 'Inter-account transfer',
      type: 'Inter-Account Transfer',
      paymentMode: transferForm.paymentMode,
      amount: -amt,
      currency: src?.currency || 'USD',
      status: 'Completed'
    };

    setTransactions(prev => [newTx, ...prev]);
    alert(`Fund Transfer of ${transferForm.amount} via ${transferForm.paymentMode} executed successfully!`);
    setIsTransferModalOpen(false);
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0 || !paymentForm.counterparty) {
      alert('Please enter a valid amount and recipient/payee name.');
      return;
    }

    const bankAcc = bankAccounts.find(b => b.id === paymentForm.bankAccountId);
    const isVendor = paymentForm.type === 'Vendor Payment';
    const signedAmount = isVendor ? -amt : amt;

    // Update account balance
    setBankAccounts(prev => prev.map(acc => {
      if (acc.id === paymentForm.bankAccountId) {
        return { ...acc, balance: acc.balance + signedAmount };
      }
      return acc;
    }));

    // Record Transaction
    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      reference: paymentForm.reference,
      accountName: bankAcc?.name || 'Bank Account',
      counterparty: paymentForm.counterparty,
      description: paymentForm.description || `${paymentForm.type} via ${paymentForm.paymentMode}`,
      type: paymentForm.type,
      paymentMode: paymentForm.paymentMode,
      amount: signedAmount,
      currency: bankAcc?.currency || 'USD',
      status: 'Completed'
    };

    setTransactions(prev => [newTx, ...prev]);
    alert(`${paymentForm.type} of ${paymentForm.amount} via ${paymentForm.paymentMode} created successfully!`);
    setIsNewPaymentModalOpen(false);
  };

  const handleCreateBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankForm.name || !newBankForm.bankName) {
      alert('Please fill in Account Name and Bank Name.');
      return;
    }

    const newAcc: BankAccount = {
      id: `b-${Date.now()}`,
      code: newBankForm.code,
      name: newBankForm.name,
      bankName: newBankForm.bankName,
      accountNumber: newBankForm.accountNumber || 'N/A',
      iban: newBankForm.iban,
      currency: newBankForm.currency,
      type: newBankForm.type,
      balance: parseFloat(newBankForm.openingBalance) || 0,
      reconciledStatus: 'Reconciled',
      connectionStatus: newBankForm.type === 'Bank' ? 'Connected' : undefined
    };

    setBankAccounts(prev => [...prev, newAcc]);
    alert(`Account "${newAcc.name}" created successfully!`);
    setIsNewBankModalOpen(false);
  };

  const filteredAccounts = bankAccounts.filter(b => 
    b.name.toLowerCase().includes(query.toLowerCase()) ||
    b.bankName.toLowerCase().includes(query.toLowerCase()) ||
    b.accountNumber.toLowerCase().includes(query.toLowerCase())
  );

  const exportHeaders = ['Code', 'Account', 'Bank', 'Account Number', 'Currency', 'Type', 'Balance', 'Status'];
  const exportRows = filteredAccounts.map(a => [
    a.code, a.name, a.bankName, a.accountNumber, a.currency, a.type, a.balance, a.reconciledStatus,
  ]);
  const totalBalance = filteredAccounts.reduce((s, a) => s + (a.balance || 0), 0);

  const exportTxHeaders = ['Date', 'Reference', 'Account', 'Counterparty', 'Description', 'Type', 'Mode', 'Amount', 'Currency', 'Status'];
  const exportTxRows = transactions.map(t => [
    t.date, t.reference, t.accountName, t.counterparty, t.description, t.type, t.paymentMode, t.amount, t.currency, t.status,
  ]);

  return (
    <div className="space-y-4 font-sans text-slate-800 p-2 md:p-6">
      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-blue-500 to-indigo-700" />
              <div className="absolute inset-0 flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Banking &amp; Payments</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Manage bank accounts, cash registers, live bank feeds, statement imports, vendor payments &amp; customer receipts for {currentEntity?.name || 'Active Entity'}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <DataToolbar
              exportFileName="bank-accounts"
              exportSheetName="Bank Accounts"
              exportTitle="Banking & Payments Workspace"
              exportSubtitle={`Bank accounts, cash registers and transactions for ${currentEntity?.name || 'Active Entity'}.`}
              exportHeaders={exportHeaders}
              exportRows={exportRows}
              exportTotals={[{ label: 'Total Balance', value: totalBalance }]}
              onRefresh={() => setQuery('')}
            />
            <DataToolbar
              exportFileName="bank-transactions"
              exportSheetName="Bank Transactions"
              exportTitle="Bank Transactions"
              exportSubtitle={`All payment transactions across accounts.`}
              exportHeaders={exportTxHeaders}
              exportRows={exportTxRows}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConnectBankModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
            >
              <Link2 className="w-4 h-4 text-indigo-600" />
              Connect Live Bank Feed
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTransferModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 shadow-xs"
            >
              <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
              Fund Transfer
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewPaymentModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold text-white bg-[#143e2b] hover:bg-[#0f3222] shadow-xs"
            >
              <Plus className="w-4 h-4" />
              New Payment / Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <KpiGrid cols={4}>
        <KpiCard icon={Wallet} label="Total Liquid Reserves" value="PKR 6,475,000" desc="Across 4 active accounts" tone="emerald" />
        <KpiCard icon={Zap} label="Live Bank Connections" value="2 Accounts Active" desc="HBL & Standard Chartered feeds" tone="indigo" />
        <KpiCard icon={Clock} label="Pending Reconciliation" value="1 Bank Account" desc="Meezan Bank needs review" tone="amber" />
        <KpiCard icon={DollarSign} label="Foreign Currency Reserves" value={`${formatMoney(bankAccounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0), 'USD')} USD`} desc="Global SCB USD Account" tone="blue" />
      </KpiGrid>

      {/* Banking Sidebar Menu / Tabs Navigation matching selected option 3 */}
      <Tabs value={activeTab} onValueChange={(val: string) => setActiveTab(val)} className="w-full space-y-4">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 flex flex-wrap gap-1">
          <TabsTrigger value="bank-accounts" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Bank Accounts
          </TabsTrigger>
          <TabsTrigger value="cash-accounts" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Cash Accounts
          </TabsTrigger>
          <TabsTrigger value="bank-connection" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Bank Connection
          </TabsTrigger>
          <TabsTrigger value="bank-import" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Bank Import
          </TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Bank Reconciliation
          </TabsTrigger>
          <TabsTrigger value="vendor-payments" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Vendor Payments
          </TabsTrigger>
          <TabsTrigger value="customer-receipts" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Customer Receipts
          </TabsTrigger>
          <TabsTrigger value="fund-transfers" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Fund Transfers
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="rounded-lg text-xs font-semibold px-3 py-1.5">
            Cash Flow Statements
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Bank Accounts */}
        <TabsContent value="bank-accounts" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search bank name, IBAN, account..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 h-9 bg-white border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setIsNewBankModalOpen(true)}
              className="h-8 text-xs font-semibold bg-[#143e2b] text-white hover:bg-[#0f3222]"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Bank Account
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07] border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-4">GL CODE</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ACCOUNT NAME</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">BANK NAME</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ACCOUNT NUMBER / IBAN</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CURRENCY</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">BALANCE</TableHead>
                  <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LIVE FEED</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider pr-4">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {filteredAccounts.filter(a => a.type === 'Bank' || a.type === 'CreditCard').map(acc => (
                  <TableRow key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="py-3.5 pl-4 font-mono text-xs font-medium text-slate-600">{acc.code}</TableCell>
                    <TableCell className="py-3.5 font-semibold text-xs text-slate-800">{acc.name}</TableCell>
                    <TableCell className="py-3.5 text-xs text-slate-600 font-medium">{acc.bankName}</TableCell>
                    <TableCell className="py-3.5 font-mono text-xs text-slate-500">{acc.accountNumber}</TableCell>
                    <TableCell className="py-3.5 font-mono text-xs font-bold text-slate-700">{acc.currency}</TableCell>
                    <TableCell className="py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                      {formatMoney(acc.balance, acc.currency)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {acc.connectionStatus === 'Connected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Zap className="w-3 h-3 text-indigo-600" /> Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Manual
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-right pr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReconAccountId(acc.id);
                          setActiveTab('reconciliation');
                        }}
                        className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                      >
                        Reconcile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: Cash Accounts */}
        <TabsContent value="cash-accounts" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200">
              <CardTitle className="text-base font-bold text-slate-900">Physical Cash Vaults & Petty Cash Funds</CardTitle>
              <CardDescription className="text-xs text-slate-500">Track petty cash registers, branch cash tills, and internal vaults.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07]">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-4">CODE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CASH REGISTER NAME</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LOCATION / VAULT</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CURRENCY</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">ON-HAND BALANCE</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider pr-4">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {bankAccounts.filter(a => a.type === 'Cash').map(acc => (
                    <TableRow key={acc.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-3.5 pl-4 font-mono text-xs font-medium text-slate-600">{acc.code}</TableCell>
                      <TableCell className="py-3.5 font-semibold text-xs text-slate-800">{acc.name}</TableCell>
                      <TableCell className="py-3.5 text-xs text-slate-600">{acc.bankName}</TableCell>
                      <TableCell className="py-3.5 font-mono text-xs font-bold text-slate-700">{acc.currency}</TableCell>
                      <TableCell className="py-3.5 text-right font-mono text-xs font-bold text-slate-900">
                        {formatMoney(acc.balance, acc.currency)}
                      </TableCell>
                      <TableCell className="py-3.5 text-right pr-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTransferForm(f => ({ ...f, sourceAccountId: acc.id }));
                            setIsTransferModalOpen(true);
                          }}
                          className="h-8 text-xs font-medium text-slate-700"
                        >
                          Replenish / Transfer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Bank Connection */}
        <TabsContent value="bank-connection" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200">
              <CardTitle className="text-base font-bold text-slate-900">Live Bank Feed Integration (Open Banking / Plaid / Yodlee)</CardTitle>
              <CardDescription className="text-xs text-slate-500">Connect your bank accounts securely for real-time automated transaction feeds.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-[11px] font-bold text-slate-800">Habib Bank Limited (HBL)</h4>
                  </div>
                  <p className="text-[10px] text-slate-500">Status: <span className="font-semibold text-emerald-600">Connected & Syncing</span></p>
                  <p className="text-[10px] text-slate-400">Last sync: Today at 02:15 AM</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-[11px] font-bold text-slate-800">Standard Chartered USA</h4>
                  </div>
                  <p className="text-[10px] text-slate-500">Status: <span className="font-semibold text-indigo-600">Connected</span></p>
                  <p className="text-[10px] text-slate-400">Last sync: Today at 01:45 AM</p>
                </div>

                <div className="p-3 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-center bg-slate-50/50">
                  <Link2 className="w-5 h-5 text-slate-400 mb-1" />
                  <p className="text-[10px] font-semibold text-slate-700">Connect New Bank Feed</p>
                  <Button
                    size="sm"
                    onClick={() => setIsConnectBankModalOpen(true)}
                    className="mt-1.5 h-7 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    + Connect Institution
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Bank Import */}
        <TabsContent value="bank-import" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200">
              <CardTitle className="text-base font-bold text-slate-900">Bank Statement File Import (CSV / OFX / QBO)</CardTitle>
              <CardDescription className="text-xs text-slate-500">Upload bank electronic statement files to import transactions for offline accounts.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-10 text-center bg-slate-50/50 transition-colors">
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800 mb-1">Drag & Drop Bank Statement File Here</h4>
                <p className="text-xs text-slate-500 mb-4">Supports CSV, OFX, QBO, MT940, and Excel formats</p>
                <Button
                  size="sm"
                  onClick={() => alert('Statement import file parser initialized. Select your CSV/OFX statement file.')}
                  className="bg-[#143e2b] text-white hover:bg-[#0f3222] h-9 text-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Select Statement File
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">All Bank & Cash Transactions</CardTitle>
                  <CardDescription className="text-xs text-slate-500">General Ledger cash movements filtered by payment mode (ACH, Wire, SWIFT, Cheque, RTGS).</CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewPaymentModalOpen(true)}
                  className="h-8 text-xs bg-[#143e2b] text-white"
                >
                  + Add Transaction
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07]">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DATE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">REFERENCE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ACCOUNT</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PAYEE / RECIPIENT</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PAYMENT MODE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TYPE</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">AMOUNT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {transactions.map(tx => (
                    <TableRow key={tx.id} className="hover:bg-slate-50/80">
                      <TableCell className="py-3 text-xs font-mono text-slate-600">{tx.date}</TableCell>
                      <TableCell className="py-3 text-xs font-semibold text-slate-800">{tx.reference}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-700">{tx.accountName}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-600 font-medium">{tx.counterparty}</TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.paymentMode}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="outline" className={`text-[11px] ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className={`py-3 text-right font-mono text-xs font-bold ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {formatMoney(tx.amount, tx.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Bank Reconciliation */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Bank Statement Reconciliation Engine</CardTitle>
                  <CardDescription className="text-xs text-slate-500">Reconcile bank statement records against general ledger posted transactions.</CardDescription>
                </div>

                <select
                  value={reconAccountId}
                  onChange={e => setReconAccountId(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-medium text-slate-500">General Ledger Balance</p>
                  <p className="text-lg font-bold text-slate-900">{formatMoney(selectedReconAccount.balance, selectedReconAccount.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Bank Statement Balance</p>
                  <Input
                    type="number"
                    value={statementBalance}
                    onChange={e => setStatementBalance(e.target.value)}
                    className="h-8 w-44 mt-1 font-mono text-xs font-bold text-slate-900 border-slate-300"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Unreconciled Difference</p>
                  <p className={`text-lg font-bold ${Math.abs(selectedReconAccount.balance - (parseFloat(statementBalance) || 0)) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatMoney(selectedReconAccount.balance - (parseFloat(statementBalance) || 0), selectedReconAccount.currency)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  onClick={() => {
                    setBankAccounts(prev => prev.map(b => b.id === selectedReconAccount.id ? { ...b, reconciledStatus: 'Reconciled', lastReconciledDate: new Date().toISOString().slice(0, 10) } : b));
                    alert(`Account "${selectedReconAccount.name}" successfully reconciled!`);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 px-4"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Complete Statement Reconciliation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 7: Vendor Payments */}
        <TabsContent value="vendor-payments" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Vendor Outgoing Payments</CardTitle>
                <CardDescription className="text-xs text-slate-500">Record disbursements to vendors via Wire, ACH, SWIFT, Cheque, RTGS, or Credit Card.</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setPaymentForm(f => ({ ...f, type: 'Vendor Payment' }));
                  setIsNewPaymentModalOpen(true);
                }}
                className="h-8 text-xs bg-[#143e2b] text-white"
              >
                + Record Vendor Payment
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07]">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DATE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">REFERENCE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">VENDOR NAME</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PAYMENT MODE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DISBURSED FROM</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">AMOUNT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {transactions.filter(t => t.type === 'Vendor Payment').map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="py-3 text-xs font-mono text-slate-600">{tx.date}</TableCell>
                      <TableCell className="py-3 text-xs font-semibold text-slate-800">{tx.reference}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-700 font-medium">{tx.counterparty}</TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.paymentMode}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-600">{tx.accountName}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-rose-600">
                        {formatMoney(tx.amount, tx.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 8: Customer Receipts */}
        <TabsContent value="customer-receipts" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Customer Incoming Receipts</CardTitle>
                <CardDescription className="text-xs text-slate-500">Record customer collections received via ACH, Wire, Payment Gateway, or Cheque.</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setPaymentForm(f => ({ ...f, type: 'Customer Receipt' }));
                  setIsNewPaymentModalOpen(true);
                }}
                className="h-8 text-xs bg-[#143e2b] text-white"
              >
                + Record Customer Receipt
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07]">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DATE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">REFERENCE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CUSTOMER NAME</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PAYMENT MODE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DEPOSITED INTO</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">AMOUNT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {transactions.filter(t => t.type === 'Customer Receipt').map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="py-3 text-xs font-mono text-slate-600">{tx.date}</TableCell>
                      <TableCell className="py-3 text-xs font-semibold text-slate-800">{tx.reference}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-700 font-medium">{tx.counterparty}</TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.paymentMode}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-xs text-slate-600">{tx.accountName}</TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-emerald-600">
                        {formatMoney(tx.amount, tx.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 9: Fund Transfers */}
        <TabsContent value="fund-transfers" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-200 flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">Inter-Account Fund Transfers</CardTitle>
                <CardDescription className="text-xs text-slate-500">Internal bank-to-bank and cash vault liquidity transfers.</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsTransferModalOpen(true)}
                className="h-8 text-xs bg-[#143e2b] text-white"
              >
                + New Inter-Bank Transfer
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <Table>
                <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07]">
                  <TableRow>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DATE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">REFERENCE</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SOURCE ACCOUNT</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TARGET ACCOUNT</TableHead>
                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">MODE</TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">AMOUNT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100">
                  {transactions.filter(t => t.type === 'Inter-Account Transfer').map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="py-3 text-xs font-mono text-slate-600">{tx.date}</TableCell>
                      <TableCell className="py-3 text-xs font-semibold text-slate-800">{tx.reference}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-700">{tx.accountName}</TableCell>
                      <TableCell className="py-3 text-xs text-slate-700">{tx.counterparty}</TableCell>
                      <TableCell className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {tx.paymentMode}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-right font-mono text-xs font-bold text-slate-800">
                        {formatMoney(tx.amount, tx.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 10: Cash Flow Statements */}
        <TabsContent value="cash-flow" className="space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Cash Flow Statement Summary (IAS 7)</CardTitle>
              <CardDescription className="text-xs text-slate-500">Operating, Investing, and Financing Cash Flow activities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-blue-500/[0.05] dark:bg-blue-400/[0.07]">
                    <TableRow>
                      <TableHead className="font-bold text-xs">CASH ACTIVITY LINE ITEM</TableHead>
                      <TableHead className="text-right font-bold text-xs">AMOUNT (PKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    <TableRow className="font-bold bg-slate-50/50">
                      <TableCell colSpan={2} className="text-xs text-slate-900">1. Operating Cash Activities</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-xs text-slate-600">Cash Received from Customers</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600">+ 12,400,000</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-xs text-slate-600">Cash Paid to Suppliers & Operations</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-rose-600">- 7,850,000</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-slate-50/50">
                      <TableCell colSpan={2} className="text-xs text-slate-900">2. Financing & Investment Activities</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-6 text-xs text-slate-600">Capital Expenditure & Fixed Asset Purchase</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-rose-600">- 1,200,000</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-emerald-50 text-emerald-900">
                      <TableCell className="text-xs">NET INCREASE IN LIQUID CASH</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">+ 3,350,000 PKR</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal 1: Inter-Bank Fund Transfer with Mode of Payment */}
      {isTransferModalOpen && (
        <div className="overlay">
          <form className="modal" onSubmit={handleExecuteTransfer} >
            <div className="modal-head">
              <div>
                <p className="eyebrow">BANKING & PAYMENTS</p>
                <h2>Inter-Account Fund Transfer</h2>
              </div>
              <button type="button" className="close" onClick={() => setIsTransferModalOpen(false)}>×</button>
            </div>

            <div className="form-grid">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Source Account (Transfer Out)</label>
                <CompactSelect
                  value={transferForm.sourceAccountId}
                  onChange={v => setTransferForm({ ...transferForm, sourceAccountId: v })}
                  placeholder="Select source account..."
                  searchPlaceholder="Search bank/cash account..."
                  options={bankAccounts.map(b => ({
                    value: b.id,
                    label: b.name,
                    sublabel: `Balance: ${formatMoney(b.balance, b.currency)}`,
                    badge: b.currency
                  }))}
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Account (Transfer In)</label>
                <CompactSelect
                  value={transferForm.targetAccountId}
                  onChange={v => setTransferForm({ ...transferForm, targetAccountId: v })}
                  placeholder="Select target account..."
                  searchPlaceholder="Search bank/cash account..."
                  options={bankAccounts.map(b => ({
                    value: b.id,
                    label: b.name,
                    sublabel: `Balance: ${formatMoney(b.balance, b.currency)}`,
                    badge: b.currency
                  }))}
                  className="h-9 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mode of Payment</label>
                  <select
                    value={transferForm.paymentMode}
                    onChange={e => setTransferForm({ ...transferForm, paymentMode: e.target.value as PaymentMode })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="RTGS">RTGS Real-Time Transfer</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="SWIFT">SWIFT International</option>
                    <option value="ACH">ACH Electronic</option>
                    <option value="Online Banking">Internal Book Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Transfer Amount</label>
                  <Input
                    required
                    type="number"
                    placeholder="0.00"
                    value={transferForm.amount}
                    onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reference / Memo</label>
                <Input
                  value={transferForm.reference}
                  onChange={e => setTransferForm({ ...transferForm, reference: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setIsTransferModalOpen(false)}>Cancel</button>
              <button type="submit" className="primary">Execute Transfer</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 2: Create Vendor Payment / Customer Receipt with Mode of Payment */}
      {isNewPaymentModalOpen && (
        <div className="overlay">
          <form className="modal" onSubmit={handleCreatePayment} >
            <div className="modal-head">
              <div>
                <p className="eyebrow">BANKING & PAYMENTS</p>
                <h2>Record {paymentForm.type}</h2>
              </div>
              <button type="button" className="close" onClick={() => setIsNewPaymentModalOpen(false)}>×</button>
            </div>

            <div className="form-grid">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Transaction Type</label>
                  <select
                    value={paymentForm.type}
                    onChange={e => setPaymentForm({ ...paymentForm, type: e.target.value as any })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  >
                    <option value="Vendor Payment">Vendor Payment (Disbursement)</option>
                    <option value="Customer Receipt">Customer Receipt (Collection)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Mode of Payment</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value as PaymentMode })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="ACH">ACH Electronic Transfer</option>
                    <option value="Wire Transfer">Wire Transfer</option>
                    <option value="SWIFT">SWIFT International</option>
                    <option value="RTGS">RTGS Transfer</option>
                    <option value="Cheque / Pay Order">Cheque / Pay Order</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Direct Debit">Direct Debit</option>
                    <option value="Online Banking">Online Banking Gateway</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank / Cash Account</label>
                <select
                  value={paymentForm.bankAccountId}
                  onChange={e => setPaymentForm({ ...paymentForm, bankAccountId: e.target.value })}
                  className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                >
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.currency}) — Bal: {formatMoney(b.balance, b.currency)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payee / Recipient Name</label>
                <Input
                  required
                  placeholder="e.g. Allied Engineering Supplies or Apex Corp"
                  value={paymentForm.counterparty}
                  onChange={e => setPaymentForm({ ...paymentForm, counterparty: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Amount</label>
                  <Input
                    required
                    type="number"
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reference Number</label>
                  <Input
                    value={paymentForm.reference}
                    onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setIsNewPaymentModalOpen(false)}>Cancel</button>
              <button type="button" className="secondary" onClick={(e) => { e.preventDefault(); alert("Draft saved locally"); }}>Save Draft</button>
              <button type="submit" className="primary">Save {paymentForm.type}</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 3: Add New Bank / Cash Account */}
      {isNewBankModalOpen && (
        <div className="overlay">
          <form className="modal" onSubmit={handleCreateBankAccount} >
            <div className="modal-head">
              <div>
                <p className="eyebrow">BANKING & PAYMENTS</p>
                <h2>Add New Bank or Cash Account</h2>
              </div>
              <button type="button" className="close" onClick={() => setIsNewBankModalOpen(false)}>×</button>
            </div>

            <div className="form-grid">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">GL Account Code</label>
                  <Input
                    required
                    value={newBankForm.code}
                    onChange={e => setNewBankForm({ ...newBankForm, code: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Type</label>
                  <select
                    value={newBankForm.type}
                    onChange={e => setNewBankForm({ ...newBankForm, type: e.target.value as any })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Bank">Bank Account</option>
                    <option value="Cash">Cash Account / Vault</option>
                    <option value="CreditCard">Credit Card Account</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Account Display Name</label>
                <Input
                  required
                  placeholder="e.g. Standard Chartered USD Corporate"
                  value={newBankForm.name}
                  onChange={e => setNewBankForm({ ...newBankForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Name / Institution</label>
                <Input
                  required
                  placeholder="e.g. Habib Bank Limited"
                  value={newBankForm.bankName}
                  onChange={e => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Number / IBAN</label>
                  <Input
                    placeholder="PK12HABB..."
                    value={newBankForm.accountNumber}
                    onChange={e => setNewBankForm({ ...newBankForm, accountNumber: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Currency</label>
                  <select
                    value={newBankForm.currency}
                    onChange={e => setNewBankForm({ ...newBankForm, currency: e.target.value })}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                  >
                    <option value="PKR">PKR (Pakistani Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="SAR">SAR (Saudi Riyal)</option>
                    <option value="CAD">CAD (Canadian Dollar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Balance</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newBankForm.openingBalance}
                  onChange={e => setNewBankForm({ ...newBankForm, openingBalance: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setIsNewBankModalOpen(false)}>Cancel</button>
              <button type="button" className="secondary" onClick={(e) => { e.preventDefault(); alert("Draft saved locally"); }}>Save Draft</button>
              <button type="submit" className="primary">Save Account</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal 4: Connect Live Bank Feed Integration */}
      {isConnectBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <Link2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Connect Live Bank Feed</h3>
            <p className="text-xs text-slate-500">Choose your banking provider to establish a real-time automated transaction sync using Open Banking standard API.</p>

            <div className="space-y-2 text-left pt-2">
              <button
                onClick={() => {
                  alert('Bank connection initialized via Open Banking API!');
                  setIsConnectBankModalOpen(false);
                }}
                className="w-full p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-bold text-slate-800">Habib Bank Limited (HBL)</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">Open Banking API</Badge>
              </button>
              <button
                onClick={() => {
                  alert('Bank connection initialized via Open Banking API!');
                  setIsConnectBankModalOpen(false);
                }}
                className="w-full p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-bold text-slate-800">Meezan Bank Digital</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700">Open Banking API</Badge>
              </button>
              <button
                onClick={() => {
                  alert('Plaid Bank Integration initialized!');
                  setIsConnectBankModalOpen(false);
                }}
                className="w-full p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <span className="text-xs font-bold text-slate-800">Standard Chartered USA / International</span>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700">Plaid / Yodlee</Badge>
              </button>
            </div>

            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsConnectBankModalOpen(false)} className="w-full text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
