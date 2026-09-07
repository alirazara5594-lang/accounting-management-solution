import React, { useState, useEffect } from 'react';
import {
  useProcurementStore,
  useVendorsStore,
  useProductsStore,
  useAssetsInventoryStore,
  useCoaStore
} from './stores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataToolbar } from '@/components/ui/data-toolbar';
import { EmptyState } from './components/ui/empty-state';
import { FileText, Mail, Scale, ShoppingCart, Package, Receipt, ArrowLeftRight, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { money } from './lib/currency';
import { getActiveTaxCodes } from './lib/taxLocalization';
import { CompactTaxSelect } from './components/CompactTaxSelect';
import { CompactProductSelect } from './components/CompactProductSelect';
import { CompactSelect } from './components/CompactSelect';

type Tab = 'pr' | 'rfq' | 'compare' | 'po' | 'grn' | 'bills' | 'matching' | 'transfers';

const destinationBadge: Record<string, { label: string; color: string }> = {
  Inventory: { label: 'Inventory Stock', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ManufacturingMaterial: { label: 'Mfg Raw Material', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  FixedAsset: { label: 'Fixed Asset', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  DirectExpense: { label: 'Direct Expense', color: 'bg-orange-100 text-orange-800 border-orange-200' }
};

const getNextBillNumber = (allBills: any[] = []): string => {
  let maxSeq = 0;
  for (const b of allBills) {
    const numStr = b.billNumber || b.reference || '';
    const match = numStr.match(/BILL-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq && num < 1000000) {
        maxSeq = num;
      }
    }
  }
  return `BILL-${String(maxSeq + 1).padStart(5, '0')}`;
};

const getNextChallanNumber = (allGrns: any[] = []): string => {
  let maxSeq = 0;
  for (const g of allGrns) {
    const dc = g.deliveryChallanNumber || '';
    const match = dc.match(/DC-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq && num < 1000000) maxSeq = num;
    }
  }
  return `DC-${String(maxSeq + 1).padStart(5, '0')}`;
};

export const ProcurementWorkspace: React.FC<{ activeEntityId: string; entities?: any[] }> = ({ activeEntityId }) => {
  const [activeTab, setActiveTab] = useState<Tab>('pr');
  const [toast, setToast] = useState('');

  const applicableTaxCodes = React.useMemo(() => getActiveTaxCodes(), [activeEntityId]);

  const requests = useProcurementStore((s) => s.requests);
  const rfqs = useProcurementStore((s) => s.rfqs);
  const vendorQuotes = useProcurementStore((s) => s.vendorQuotes);
  const orders = useProcurementStore((s) => s.orders);
  const grns = useProcurementStore((s) => s.grns);
  const bills = useProcurementStore((s) => s.bills);
  const transfers = useProcurementStore((s) => s.transfers);
  const loading = useProcurementStore((s) => s.loading);

  const sortedRequests = React.useMemo(() => [...requests].sort((a: any, b: any) => {
    const dateA = a.createdAt || a.requestDate || a.date || '';
    const dateB = b.createdAt || b.requestDate || b.date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const numA = a.requestNumber || '';
    const numB = b.requestNumber || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  }), [requests]);

  const sortedRfqs = React.useMemo(() => [...rfqs].sort((a: any, b: any) => {
    const dateA = a.createdAt || a.rfqDate || a.date || '';
    const dateB = b.createdAt || b.rfqDate || b.date || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const numA = a.rfqNumber || '';
    const numB = b.rfqNumber || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  }), [rfqs]);

  const sortedOrders = React.useMemo(() => [...orders].sort((a: any, b: any) => {
    const dateA = a.orderDate || a.date || a.createdAt || '';
    const dateB = b.orderDate || b.date || b.createdAt || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const numA = a.orderNumber || a.poNumber || '';
    const numB = b.orderNumber || b.poNumber || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  }), [orders]);

  const sortedGrns = React.useMemo(() => [...grns].sort((a: any, b: any) => {
    const dateA = a.receivedDate || a.dateReceived || a.receiptDate || a.createdAt || '';
    const dateB = b.receivedDate || b.dateReceived || b.receiptDate || b.createdAt || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const numA = a.grnNumber || '';
    const numB = b.grnNumber || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  }), [grns]);

  const sortedBills = React.useMemo(() => [...bills].sort((a: any, b: any) => {
    const dateA = a.billDate || a.date || a.createdAt || '';
    const dateB = b.billDate || b.date || b.createdAt || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const numA = a.billNumber || a.vendorInvoiceNumber || a.reference || '';
    const numB = b.billNumber || b.vendorInvoiceNumber || b.reference || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  }), [bills]);

  const sortedTransfers = React.useMemo(() => [...transfers].sort((a: any, b: any) => {
    const dateA = a.transferDate || a.date || a.createdAt || '';
    const dateB = b.transferDate || b.date || b.createdAt || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    const numA = a.transferNumber || '';
    const numB = b.transferNumber || '';
    return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: 'base' });
  }), [transfers]);

  const fetchAllProcurement = useProcurementStore((s) => s.fetchAllProcurement);
  const createRequestStore = useProcurementStore((s) => s.createRequest);
  const createRfqStore = useProcurementStore((s) => s.createRfq);
  const submitVendorQuoteStore = useProcurementStore((s) => s.submitVendorQuote);
  const selectVendorQuoteStore = useProcurementStore((s) => s.selectVendorQuote);
  const createOrderStore = useProcurementStore((s) => s.createOrder);
  const receiveGrnStore = useProcurementStore((s) => s.receiveGrn);
  const createVendorBillStore = useProcurementStore((s) => s.createVendorBill);
  const validateThreeWayMatchStore = useProcurementStore((s) => s.validateThreeWayMatch);
  const createTransferStore = useProcurementStore((s) => s.createTransfer);

  const vendors = useVendorsStore((s) => s.vendors);
  const fetchVendors = useVendorsStore((s) => s.fetchVendors);

  const products = useProductsStore((s) => s.products);
  const fetchProducts = useProductsStore((s) => s.fetchProducts);

  const warehouses = useAssetsInventoryStore((s) => s.warehouses);
  const fetchWarehouses = useAssetsInventoryStore((s) => s.fetchWarehouses);

  const accounts = useCoaStore((s) => s.accounts);
  const fetchAccounts = useCoaStore((s) => s.fetchAccounts);

  useEffect(() => {
    fetchAllProcurement(activeEntityId);
    fetchVendors(activeEntityId);
    fetchProducts();
    fetchWarehouses(activeEntityId);
    fetchAccounts();
  }, [activeEntityId]);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ─── Modal States ──────────────────────────────────────────────────────────
  // 1. PR Form State
  const [showPrModal, setShowPrModal] = useState(false);
  const [prForm, setPrForm] = useState({
    requestorName: 'Procurement Admin',
    department: 'General',
    purpose: '',
    priority: 'Medium',
    requiredByDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });
  const [prLines, setPrLines] = useState([
    { description: '', productId: '', quantity: '1', estimatedUnitPrice: '0', destination: 'Inventory' as any, targetWarehouseId: '', expenseAccountId: '' }
  ]);

  // 2. RFQ Form State
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [rfqForm, setRfqForm] = useState({
    title: '',
    purchaseRequestId: '',
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    invitedVendorIds: [] as string[]
  });
  const [rfqLines, setRfqLines] = useState<any[]>([
    { description: '', productId: '', quantity: '1', destination: 'Inventory' }
  ]);

  // 3. Vendor Quote Form State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ rfqId: '', vendorId: '', deliveryLeadTimeDays: '7' });
  const [quoteLines, setQuoteLines] = useState<any[]>([]);

  // 4. Direct PO Form State
  const [showPoModal, setShowPoModal] = useState(false);
  const [poForm, setPoForm] = useState({
    vendorId: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    purchaseRequestId: ''
  });
  const [poLines, setPoLines] = useState<any[]>([
    { description: '', productId: '', quantity: '1', unitPrice: '0', taxCode: applicableTaxCodes[0]?.code || '', taxAmount: 0, destination: 'Inventory', targetWarehouseId: '' }
  ]);

  // 5. GRN Form State
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [grnForm, setGrnForm] = useState({ purchaseOrderId: '', deliveryChallanNumber: '', targetWarehouseId: '' });
  const [grnLines, setGrnLines] = useState<any[]>([]);

  // 6. Vendor Bill Form State
  const [showBillModal, setShowBillModal] = useState(false);
  const [billForm, setBillForm] = useState({ purchaseOrderId: '', vendorId: '', billNumber: '', vendorInvoiceNumber: '', date: new Date().toISOString().split('T')[0], dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
  const [billLines, setBillLines] = useState<any[]>([]);

  // 7. 3-Way Match State
  const [matchResult, setMatchResult] = useState<any>(null);

  // 8. Transfer Form State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ sourceWarehouseId: '', destinationWarehouseId: '', productId: '', quantity: '1', reason: 'Transfer to Manufacturing Raw Materials' });

  // ─── Handlers ──────────────────────────────────────────────────────────────
  // PR Handlers
  const addPrLine = () => setPrLines([...prLines, { description: '', productId: '', quantity: '1', estimatedUnitPrice: '0', destination: 'Inventory', targetWarehouseId: warehouses[0]?.id || '', expenseAccountId: '' }]);
  const removePrLine = (idx: number) => setPrLines(prLines.filter((_, i) => i !== idx));

  const handlePrProductSelect = (idx: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    const updated = [...prLines];
    updated[idx].productId = prodId;
    if (prod) {
      updated[idx].description = prod.name;
      updated[idx].estimatedUnitPrice = String(prod.costPrice || prod.unitPrice || 0);
    }
    setPrLines(updated);
  };

  const savePr = async () => {
    if (prLines.length === 0 || !prLines[0].description) return alert('Please enter at least one line item description.');
    const body = {
      ...prForm,
      companyId: activeEntityId || null,
      date: new Date().toISOString().split('T')[0],
      lines: prLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        quantity: parseFloat(l.quantity) || 1,
        estimatedUnitPrice: parseFloat(l.estimatedUnitPrice) || 0,
        destination: l.destination,
        targetWarehouseId: l.targetWarehouseId || warehouses[0]?.id || null,
        expenseAccountId: l.expenseAccountId || null
      }))
    };
    try {
      await createRequestStore(body);
      notify('✓ Purchase Request (PR) created successfully!');
      setShowPrModal(false);
    } catch (e: any) {
      notify(e.message || 'Error creating PR');
    }
  };

  // Convert PR to RFQ
  const handlePrToRfq = (pr: any) => {
    setRfqForm({
      title: `RFQ for PR ${pr.requestNumber} - ${pr.department}`,
      purchaseRequestId: pr.id,
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      invitedVendorIds: vendors.slice(0, 3).map(v => v.id)
    });
    setRfqLines((pr.lines || []).map((l: any) => ({
      description: l.description,
      productId: l.productId || '',
      quantity: String(l.quantity || 1),
      destination: l.destination || 'Inventory'
    })));
    setShowRfqModal(true);
  };

  // Convert PR to Direct PO
  const handlePrToPo = (pr: any) => {
    setPoForm({
      vendorId: vendors[0]?.id || '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      purchaseRequestId: pr.id
    });
    setPoLines((pr.lines || []).map((l: any) => ({
      description: l.description,
      productId: l.productId || '',
      quantity: String(l.quantity || 1),
      unitPrice: String(l.estimatedUnitPrice || 0),
      taxCode: applicableTaxCodes[0]?.code || '',
      taxAmount: 0,
      destination: l.destination || 'Inventory',
      targetWarehouseId: l.targetWarehouseId || warehouses[0]?.id || ''
    })));
    setShowPoModal(true);
  };

  // RFQ Handlers
  const handleOpenRfqModal = () => {
    setRfqForm({
      title: 'RFQ for Procured Items',
      purchaseRequestId: '',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      invitedVendorIds: vendors.slice(0, 3).map(v => v.id)
    });
    setRfqLines([{ description: '', productId: '', quantity: '1', destination: 'Inventory' }]);
    setShowRfqModal(true);
  };

  const addRfqLine = () => setRfqLines([...rfqLines, { description: '', productId: '', quantity: '1', destination: 'Inventory' }]);
  const removeRfqLine = (idx: number) => setRfqLines(rfqLines.filter((_, i) => i !== idx));

  const saveRfq = async () => {
    if (!rfqForm.title) return alert('Please enter RFQ title.');
    if (rfqLines.length === 0 || !rfqLines[0].description) return alert('Please enter at least one RFQ item.');
    const body = {
      title: rfqForm.title,
      purchaseRequestId: rfqForm.purchaseRequestId || null,
      deadline: rfqForm.deadline,
      invitedVendorIds: rfqForm.invitedVendorIds,
      companyId: activeEntityId || null,
      lines: rfqLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        quantity: parseFloat(l.quantity) || 1,
        destination: l.destination || 'Inventory'
      }))
    };
    try {
      await createRfqStore(body);
      notify('✓ Request for Quotation (RFQ) created!');
      setShowRfqModal(false);
      setActiveTab('rfq');
    } catch (e: any) {
      notify(e.message || 'Error creating RFQ');
    }
  };

  // Vendor Quote Handlers
  const handleOpenQuoteModal = (rfq: any) => {
    setQuoteForm({ rfqId: rfq.id, vendorId: vendors[0]?.id || '', deliveryLeadTimeDays: '7' });
    setQuoteLines((rfq.lines || []).map((l: any) => ({ description: l.description, productId: l.productId, quantity: l.quantity, quotedUnitPrice: l.estimatedUnitPrice || 0, destination: l.destination })));
    setShowQuoteModal(true);
  };

  const saveQuote = async () => {
    if (!quoteForm.vendorId) return alert('Select vendor.');
    const vendor = vendors.find(v => v.id === quoteForm.vendorId);
    const body = {
      rfqId: quoteForm.rfqId,
      vendorId: quoteForm.vendorId,
      vendorName: vendor?.name || 'Vendor',
      deliveryLeadTimeDays: parseInt(quoteForm.deliveryLeadTimeDays || '7'),
      companyId: activeEntityId || null,
      lines: quoteLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        quantity: parseFloat(l.quantity) || 1,
        quotedUnitPrice: parseFloat(l.quotedUnitPrice) || 0,
        destination: l.destination
      }))
    };
    try {
      await submitVendorQuoteStore(body);
      notify('✓ Vendor Quote submitted!');
      setShowQuoteModal(false);
    } catch (e: any) {
      notify(e.message || 'Error submitting quote');
    }
  };

  const awardQuote = async (quoteId: string) => {
    try {
      await selectVendorQuoteStore(quoteId, activeEntityId);
      notify('✓ Vendor Quote awarded! Purchase Order (PO) automatically generated.');
      setActiveTab('po');
    } catch (e: any) {
      notify(e.message || 'Error awarding quote');
    }
  };

  // Direct PO Handlers
  const handleOpenPoModal = () => {
    setPoForm({
      vendorId: vendors[0]?.id || '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      purchaseRequestId: ''
    });
    setPoLines([{ description: '', productId: '', quantity: '1', unitPrice: '0', taxCode: applicableTaxCodes[0]?.code || '', taxAmount: 0, destination: 'Inventory', targetWarehouseId: warehouses[0]?.id || '' }]);
    setShowPoModal(true);
  };

  const addPoLine = () => setPoLines([...poLines, { description: '', productId: '', quantity: '1', unitPrice: '0', taxCode: applicableTaxCodes[0]?.code || '', taxAmount: 0, destination: 'Inventory', targetWarehouseId: warehouses[0]?.id || '' }]);
  const removePoLine = (idx: number) => setPoLines(poLines.filter((_, i) => i !== idx));

  const handlePoProductSelect = (idx: number, prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    const updated = [...poLines];
    updated[idx].productId = prodId;
    if (prod) {
      updated[idx].description = prod.name;
      updated[idx].unitPrice = String(prod.costPrice || prod.unitPrice || 0);
    }
    setPoLines(updated);
  };

  const savePo = async () => {
    if (!poForm.vendorId) return alert('Please select a vendor.');
    if (poLines.length === 0 || !poLines[0].description) return alert('Please enter at least one line item.');
    const body = {
      vendorId: poForm.vendorId,
      date: poForm.orderDate,
      expectedDeliveryDate: poForm.expectedDeliveryDate,
      companyId: activeEntityId || null,
      lines: poLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        quantity: parseFloat(l.quantity) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
        taxAmount: parseFloat(l.taxAmount) || 0,
        destination: l.destination || 'Inventory'
      }))
    };
    try {
      await createOrderStore(body);
      notify('✓ Purchase Order (PO) created!');
      setShowPoModal(false);
      setActiveTab('po');
    } catch (e: any) {
      notify(e.message || 'Error creating PO');
    }
  };

  // GRN Handlers
  const handleOpenGrnModal = (po: any) => {
    setGrnForm({ purchaseOrderId: po.id, deliveryChallanNumber: getNextChallanNumber(grns), targetWarehouseId: warehouses[0]?.id || '' });
    setGrnLines((po.lines || []).map((l: any) => ({
      description: l.description,
      productId: l.productId,
      orderedQuantity: l.quantity,
      receivedQuantity: l.quantity,
      rejectedQuantity: 0,
      unitCost: l.unitPrice,
      destination: l.destination || 'Inventory',
      targetWarehouseId: warehouses[0]?.id || ''
    })));
    setShowGrnModal(true);
  };

  const saveGrn = async () => {
    const po = orders.find(p => p.id === grnForm.purchaseOrderId);
    const vendor = vendors.find(v => v.id === po?.vendorId);
    const body = {
      purchaseOrderId: grnForm.purchaseOrderId,
      purchaseOrderNumber: po?.orderNumber || po?.poNumber || 'PO-00001',
      vendorId: po?.vendorId || '',
      vendorName: vendor?.name || 'Vendor',
      deliveryChallanNumber: grnForm.deliveryChallanNumber,
      targetWarehouseId: grnForm.targetWarehouseId,
      companyId: activeEntityId || null,
      lines: grnLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        orderedQuantity: parseFloat(l.orderedQuantity) || 0,
        receivedQuantity: parseFloat(l.receivedQuantity) || 0,
        rejectedQuantity: parseFloat(l.rejectedQuantity || '0') || 0,
        unitCost: parseFloat(l.unitCost) || 0,
        destination: l.destination,
        targetWarehouseId: l.targetWarehouseId || grnForm.targetWarehouseId
      }))
    };
    try {
      await receiveGrnStore(body, activeEntityId);
      notify('✓ GRN processed! Items successfully routed to destination (Inventory, Assets, Expense, Mfg).');
      setShowGrnModal(false);
      setActiveTab('grn');
    } catch (e: any) {
      notify(e.message || 'Error receiving GRN');
    }
  };

  // Vendor Bill Handlers
  const handleOpenBillModal = (po: any) => {
    const vId = po?.vendorId || vendors[0]?.id || '';
    setBillForm({
      purchaseOrderId: po?.id || '',
      vendorId: vId,
      billNumber: getNextBillNumber(bills),
      vendorInvoiceNumber: `INV-SUPP-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    });
    setBillLines((po?.lines || []).map((l: any) => ({
      description: l.description,
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      destination: l.destination || 'Inventory'
    })));
    setShowBillModal(true);
  };

  const saveBill = async () => {
    if (!billForm.vendorInvoiceNumber) return alert('Please enter Supplier Invoice Number.');
    const body = {
      purchaseOrderId: billForm.purchaseOrderId || null,
      vendorId: billForm.vendorId,
      billNumber: billForm.billNumber,
      vendorInvoiceNumber: billForm.vendorInvoiceNumber,
      date: billForm.date,
      dueDate: billForm.dueDate,
      companyId: activeEntityId || null,
      lines: billLines.map(l => ({
        description: l.description,
        productId: l.productId || null,
        quantity: parseFloat(l.quantity) || 1,
        unitPrice: parseFloat(l.unitPrice) || 0,
        taxAmount: parseFloat(l.taxAmount || '0') || 0,
        destination: l.destination || 'Expense'
      }))
    };
    try {
      await createVendorBillStore(body, activeEntityId);
      notify('✓ Vendor Bill / Invoice posted! Accounts Payable updated.');
      setShowBillModal(false);
      setActiveTab('bills');
      if (billForm.purchaseOrderId) runMatchCheck(billForm.purchaseOrderId);
    } catch (e: any) {
      notify(e.message || 'Error creating Vendor Bill');
    }
  };

  // 3-Way Match Check Handler
  const runMatchCheck = async (poId: string) => {
    const res = await validateThreeWayMatchStore(poId);
    setMatchResult(res);
    setActiveTab('matching');
  };

  // Transfer Handlers
  const saveTransfer = async () => {
    if (!transferForm.sourceWarehouseId || !transferForm.destinationWarehouseId || !transferForm.productId) return alert('Please select source, destination, and product.');
    if (transferForm.sourceWarehouseId === transferForm.destinationWarehouseId) return alert('Source and destination warehouse cannot be identical.');
    const prod = products.find(p => p.id === transferForm.productId);
    const body = {
      ...transferForm,
      productName: prod?.name || '',
      quantity: parseFloat(transferForm.quantity) || 1,
      companyId: activeEntityId || null
    };
    try {
      await createTransferStore(body, activeEntityId);
      notify('✓ Stock transfer completed between warehouses!');
      setShowTransferModal(false);
      setActiveTab('transfers');
    } catch (e: any) {
      notify(e.message || 'Error transferring stock');
    }
  };

  const tabsList: { id: Tab; label: string; icon: string }[] = [
    { id: 'pr', label: 'Purchase Requests', icon: '📋' },
    { id: 'rfq', label: 'RFQ', icon: '📩' },
    { id: 'compare', label: 'Quote Comparison', icon: '⚖️' },
    { id: 'po', label: 'Purchase Orders', icon: '📜' },
    { id: 'grn', label: 'GRN', icon: '📦' },
    { id: 'bills', label: 'Vendor Bills', icon: '💳' },
    { id: 'matching', label: '3-Way Match', icon: '🔍' },
    { id: 'transfers', label: 'Transfers', icon: '🔄' },
  ];

  return (
    <div className="space-y-6">
      {toast && <div className="fixed top-6 right-6 z-50 px-5 py-3 bg-emerald-600 text-white rounded-2xl shadow-lg text-sm font-medium">{toast}</div>}

      {/* Page Header — AMS Signature Hero Band */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.03] to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div className="absolute inset-[6px] rotate-45 rounded-[12px] shadow-xl bg-gradient-to-br from-emerald-500 to-green-700" />
              <div className="absolute inset-0 flex items-center justify-center"><ShoppingCart className="w-6 h-6 text-white" /></div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-[var(--color-text-strong)]">Procurement Workspace</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Ledger</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">End-to-end 8-step lifecycle: PR → RFQ → Quotes → PO → GRN → Bills → 3-Way Match → Stock Transfers.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <DataToolbar
              exportFileName="procurement-lifecycle"
              exportSheetName="Procurement Lifecycle"
              exportTitle="Enterprise Procurement Workspace"
              exportSubtitle="Full 8-step procurement lifecycle: PR, RFQ, quotes, PO, GRN, bills, 3-way match, transfers."
              exportHeaders={['Type', 'Number', 'Vendor / Requestor', 'Date', 'Amount', 'Status']}
              exportRows={[
                ...requests.map((pr: any) => ['PR', pr.requestNumber, (pr as any).requesterName || pr.requestorName, pr.createdAt || pr.date || '', pr.totalEstimatedAmount || 0, ['Draft', 'Submitted', 'Approved', 'Rejected', 'Ordered'][pr.status] || pr.status]),
                ...orders.map((po: any) => {
                  const vendor = vendors.find((v: any) => v.id === po.vendorId);
                  const total = po.lines?.reduce((s: number, l: any) => s + (l.totalAmount || 0), 0) || 0;
                  return ['PO', po.poNumber || po.orderNumber, vendor?.name || 'Unknown', po.date, total, ['Draft', 'Issued', 'Partially Received', 'Fulfilled'][po.status] || po.status];
                }),
                ...grns.map((grn: any) => ['GRN', grn.grnNumber, grn.purchaseOrderId, grn.dateReceived, 0, grn.isProcessed ? 'Processed' : 'Pending']),
                ...vendorQuotes.map((q: any) => {
                  const vendor = vendors.find((v: any) => v.id === q.vendorId);
                  return ['Quote', q.quoteNumber || q.rfqNumber, vendor?.name || 'Unknown', q.quotedDate || '', q.totalQuotedPrice || 0, q.awarded ? 'Awarded' : 'Open'];
                }),
              ]}
              exportTotals={[
                { label: 'Purchase Requests', value: requests.length },
                { label: 'Purchase Orders', value: orders.length },
                { label: 'GRNs', value: grns.length },
                { label: 'Vendor Quotes', value: vendorQuotes.length },
              ]}
              onRefresh={() => fetchAllProcurement(activeEntityId)}
            />
            <button onClick={() => setShowPrModal(true)} className="secondary h-9 px-3 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">＋ PR</button>
            <button onClick={handleOpenRfqModal} className="secondary h-9 px-3 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">＋ RFQ</button>
            <button onClick={handleOpenPoModal} className="secondary h-9 px-3 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">＋ Direct PO</button>
            <button onClick={() => setShowTransferModal(true)} className="primary h-9 px-3 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap">＋ Transfer</button>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center border border-gray-200 gap-0 bg-gray-50/80 p-1 rounded-xl flex-nowrap w-full overflow-x-auto">
        {tabsList.map((t, i) => (
          <React.Fragment key={t.id}>
            <button
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-semibold text-[10px] whitespace-nowrap transition-all flex-1 justify-center ${activeTab === t.id ? 'bg-white text-blue-700 shadow-xs border border-gray-200/60 font-bold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'}`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
            {i < tabsList.length - 1 && (
              <span className="text-gray-400 text-[9px] px-0.5 select-none shrink-0">→</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ─── TAB 1: PR List ─────────────────────────────────────────────────── */}
      {activeTab === 'pr' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Purchase Requests (PR)</h3>
              <p className="text-xs text-gray-500">Internal requisitions submitted for inventory replenishment, manufacturing materials, fixed assets, or expenses.</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowPrModal(true)}>
              ＋ New Purchase Request
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">PR Number</th>
                  <th className="py-3 px-4">Requestor</th>
                  <th className="py-3 px-4">Dept</th>
                  <th className="py-3 px-4 text-right">Est. Amount</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedRequests.map(pr => (
                  <tr key={pr.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{pr.requestNumber}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{(pr as any).requesterName || pr.requestorName}</td>
                    <td className="py-3 px-4 text-gray-500">{pr.department}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">{money(pr.totalEstimatedAmount)}</td>
                    <td className="py-3 px-4 text-gray-500">{pr.lines?.length || 0} Items</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {pr.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs h-7 px-2"
                        onClick={() => handlePrToRfq(pr)}
                        title="Generate Request for Quotation (RFQ) from this PR"
                      >
                        📩 RFQ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-7 px-2"
                        onClick={() => handlePrToPo(pr)}
                        title="Generate direct Purchase Order (PO) from this PR"
                      >
                        📜 Direct PO
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && requests.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState icon={FileText} title="No Purchase Requests found" hint='Click "+ New Purchase Request" to begin.' />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: RFQs & Vendor Quotes ────────────────────────────────────── */}
      {activeTab === 'rfq' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Requests for Quotation (RFQ)</h3>
              <p className="text-xs text-gray-500">Solicit competitive pricing quotes from multiple vendors before awarding Purchase Orders.</p>
            </div>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleOpenRfqModal}>
              ＋ New RFQ
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {sortedRfqs.map(rfq => (
              <Card key={rfq.id} className="border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-1 rounded">{rfq.rfqNumber}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> Due: {rfq.dueDate || (rfq as any).deadline}
                    </span>
                  </div>
                  <CardTitle className="text-base font-bold text-gray-900 mt-2">{rfq.title || 'RFQ for Requested Items'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs pt-2">
                  <div className="border-t pt-2 space-y-1">
                    {rfq.lines?.map((l: any, i: number) => (
                      <div key={i} className="flex justify-between text-gray-600">
                        <span>• {l.description}</span>
                        <span className="font-semibold">{l.quantity} Pcs</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-between items-center border-t">
                    <span className="text-gray-500 font-medium">
                      {vendorQuotes.filter(q => q.rfqId === rfq.id || (q as any).requestForQuotationId === rfq.id).length} Quotes Received
                    </span>
                    <Button size="sm" variant="outline" className="text-purple-700 border-purple-200 hover:bg-purple-50" onClick={() => handleOpenQuoteModal(rfq)}>
                      + Submit Vendor Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!loading && rfqs.length === 0 && (
              <div className="col-span-full">
                <EmptyState icon={Mail} title="No Request for Quotations (RFQs) created yet" hint='Click "+ New RFQ" or convert an approved PR to solicit quotes.' />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: Quotation Comparison & Selection ────────────────────────── */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Side-by-Side Vendor Quote Comparison & Award Engine</h3>
            <p className="text-xs text-gray-500">Compare price quotes, delivery lead times, and terms side-by-side. Awarding a quote automatically generates the Purchase Order (PO).</p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 text-xs uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Quote No.</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4 text-center">Lead Time</th>
                    <th className="py-3 px-4 text-right">Total Quoted Price</th>
                    <th className="py-3 px-4 text-center">Award Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vendorQuotes.map(vq => (
                    <tr key={vq.id} className={`hover:bg-gray-50/50 ${vq.isSelected || (vq as any).isWinningQuote ? 'bg-emerald-50/60' : ''}`}>
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">{vq.quoteNumber}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{vq.vendorName || vendors.find(v => v.id === vq.vendorId)?.name || 'Vendor'}</td>
                      <td className="py-3 px-4 text-center text-gray-600">{vq.deliveryLeadTimeDays} Days</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 text-base">{money(vq.totalAmount)}</td>
                      <td className="py-3 px-4 text-center">
                        {vq.isSelected || (vq as any).isWinningQuote ? (
                          <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-full text-xs font-bold">🏆 Awarded PO</span>
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">Under Evaluation</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!vq.isSelected && !(vq as any).isWinningQuote && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => awardQuote(vq.id)}>
                            Award & Generate PO
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && vendorQuotes.length === 0 && (
                    <tr><td colSpan={6}>
                      <EmptyState icon={Scale} title="No vendor quotes submitted for comparison" hint="Submit vendor quotes against open RFQs to compare and award." />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Purchase Orders (PO) ────────────────────────────────────── */}
      {activeTab === 'po' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Purchase Orders (PO)</h3>
              <p className="text-xs text-gray-500">Official legal commitments issued to vendors. Receive via GRN and track against Vendor Bills.</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleOpenPoModal}>
              ＋ Direct Purchase Order
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 border-b border-gray-100 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">PO Number</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedOrders.map(po => (
                  <tr key={po.id} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{po.orderNumber || po.poNumber}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{vendors.find(v => v.id === po.vendorId)?.name || 'Vendor'}</td>
                    <td className="py-3 px-4 text-gray-500">{po.orderDate || po.date}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">{money(po.totalAmount || po.lines?.reduce((s: number, l: any) => s + (l.totalAmount || (l.quantity * l.unitPrice)), 0))}</td>
                    <td className="py-3 px-4 text-center"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">{po.status}</span></td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button size="sm" variant="outline" className="text-purple-600 border-purple-200 hover:bg-purple-50 text-xs h-7 px-2" onClick={() => handleOpenGrnModal(po)}>
                        Process GRN
                      </Button>
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs h-7 px-2" onClick={() => handleOpenBillModal(po)}>
                        + Vendor Bill
                      </Button>
                      <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-7 px-2" onClick={() => runMatchCheck(po.id)}>
                        3-Way Match
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loading && orders.length === 0 && (
                  <tr><td colSpan={6}>
                    <EmptyState icon={ShoppingCart} title="No Purchase Orders found" hint='Click "+ Direct Purchase Order" or award an RFQ quote.' />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: GRN & Destination Routing ───────────────────────────────── */}
      {activeTab === 'grn' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex justify-between items-center">
              <span>Goods Receipt Notes (GRN) & Destination Routing History</span>
              <span className="text-xs font-normal text-gray-500">Auto-routes to Inventory, Manufacturing Raw Materials, Fixed Assets, or Expenses</span>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 text-xs uppercase">
                <tr>
                  <th className="py-3 px-4">GRN Number</th>
                  <th className="py-3 px-4">PO Ref</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Challan No.</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Line Destinations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedGrns.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{g.grnNumber}</td>
                    <td className="py-3 px-4 font-mono text-xs text-gray-500">{g.purchaseOrderNumber}</td>
                    <td className="py-3 px-4 font-medium">{g.vendorName}</td>
                    <td className="py-3 px-4 text-gray-500">{g.deliveryChallanNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{g.receivedDate}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {g.lines?.map((l, i) => {
                          const badge = destinationBadge[l.destination] || { label: l.destination, color: 'bg-gray-100' };
                          return <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>{badge.label}</span>;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && grns.length === 0 && (
                  <tr><td colSpan={6}>
                    <EmptyState icon={Package} title="No Goods Receipt Notes recorded" hint="Receive items on a Purchase Order to populate GRN." />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 6: Vendor Bills & Invoices ──────────────────────────────────── */}
      {activeTab === 'bills' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden space-y-4">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center font-bold text-gray-800 text-sm">
            <span>Supplier Invoices & Vendor Bills History</span>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleOpenBillModal(orders[0] || {})}>+ Create Vendor Bill</Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 text-xs uppercase">
              <tr><th className="py-3 px-4">Bill Number</th><th className="py-3 px-4">Supplier Invoice #</th><th className="py-3 px-4">Vendor</th><th className="py-3 px-4">Bill Date</th><th className="py-3 px-4">Due Date</th><th className="py-3 px-4 text-right">Total Amount</th><th className="py-3 px-4 text-center">3-Way Match</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedBills.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900">{b.billNumber}</td>
                  <td className="py-3 px-4 font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded w-fit">{b.vendorInvoiceNumber || b.vendorBillNumber}</td>
                  <td className="py-3 px-4 font-medium">{vendors.find(v => v.id === b.vendorId)?.name || 'Vendor'}</td>
                  <td className="py-3 px-4 text-gray-500">{b.date}</td>
                  <td className="py-3 px-4 text-gray-500">{b.dueDate}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">{money(b.lines?.reduce((acc: number, l: any) => acc + ((l.quantity || 1) * (l.unitPrice || 0) + (l.taxAmount || 0)), 0))}</td>
                  <td className="py-3 px-4 text-center">
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-7 px-2" onClick={() => runMatchCheck(b.purchaseOrderId || b.id)}>
                      Inspect Match
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && bills.length === 0 && (
                <tr><td colSpan={7}>
                  <EmptyState icon={Receipt} title="No Vendor Bills created" hint='Click "+ Create Vendor Bill" to post supplier invoice.' />
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 7: 3-Way Matching Engine ───────────────────────────────────── */}
      {activeTab === 'matching' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900">3-Way Matching Discrepancy Inspector (PO vs GRN vs Vendor Bill)</h3>
            <p className="text-xs text-gray-500">Automated match inspector verifying quantity ordered, quantity received, and billed amount before releasing Accounts Payable payment.</p>

            {matchResult ? (
              <div className={`p-4 rounded-xl border ${matchResult.isMatched ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-gray-900">Match Result for PO #{matchResult.purchaseOrderNumber}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${matchResult.isMatched ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>{matchResult.status}</span>
                </div>
                <p className="text-xs font-medium text-gray-700">{matchResult.details}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t text-xs">
                  <div className="bg-white/80 p-3 rounded-lg border border-gray-200">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">PO Ordered:</span>
                    <p className="font-bold text-base text-gray-900">{money(matchResult.orderedAmount)}</p>
                    <p className="text-xs text-gray-500">Qty: {matchResult.orderedQuantity?.toFixed(2) || '0'}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-gray-200">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">GRN Received:</span>
                    <p className="font-bold text-base text-purple-700">{money(matchResult.receivedAmount)}</p>
                    <p className="text-xs text-gray-500">Qty: {matchResult.receivedQuantity?.toFixed(2) || '0'}</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-gray-200">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Bill Billed:</span>
                    <p className="font-bold text-base text-emerald-700">{money(matchResult.billedAmount)}</p>
                    <p className="text-xs text-gray-500">Qty: {matchResult.billedQuantity?.toFixed(2) || '0'}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-white/70 rounded-lg border border-gray-200">
                  <p className="text-xs font-bold text-gray-700">Discrepancy Details:</p>
                  <p className="text-xs text-gray-600 mt-0.5">{matchResult.details || 'No variances detected between PO, GRN, and Supplier Invoice.'}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                Select a Purchase Order from the PO tab and click "3-Way Match" to inspect discrepancies.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 8: Stock Transfers ─────────────────────────────────────────── */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-xs">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Inter-Warehouse Stock Transfers</h3>
              <p className="text-xs text-gray-500">Transfer inventory items between warehouses (e.g. from central store to manufacturing raw materials floor).</p>
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowTransferModal(true)}>
              ＋ New Stock Transfer
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-500/[0.05] dark:bg-emerald-400/[0.07] text-gray-500 text-xs uppercase">
                <tr><th className="py-3 px-4">Transfer No.</th><th className="py-3 px-4">Date</th><th className="py-3 px-4">Product</th><th className="py-3 px-4">Source Warehouse</th><th className="py-3 px-4">Destination Warehouse</th><th className="py-3 px-4 text-right">Quantity</th><th className="py-3 px-4">Reason</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">{t.transferNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{t.date}</td>
                    <td className="py-3 px-4 font-medium">{t.productName}</td>
                    <td className="py-3 px-4 text-gray-500">{warehouses.find(w => w.id === t.sourceWarehouseId)?.name || 'Source'}</td>
                    <td className="py-3 px-4 text-gray-500">{warehouses.find(w => w.id === t.destinationWarehouseId)?.name || 'Destination'}</td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">{t.quantity}</td>
                    <td className="py-3 px-4 text-xs text-gray-500">{t.reason}</td>
                  </tr>
                ))}
                {!loading && transfers.length === 0 && (
                  <tr><td colSpan={7}>
                    <EmptyState icon={ArrowLeftRight} title="No warehouse stock transfers recorded" hint='Click "+ New Stock Transfer" to move goods between locations.' />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: Create Purchase Request (PR) ─────────────────────────── */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Purchase Request (PR)</h2>
                <p className="text-xs text-gray-500">Initiate an internal requisition for catalog items, raw materials, fixed assets, or direct expenses.</p>
              </div>
              <button onClick={() => setShowPrModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Requestor Name</label>
                  <Input value={prForm.requestorName} onChange={e => setPrForm({ ...prForm, requestorName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Department</label>
                  <Input value={prForm.department} onChange={e => setPrForm({ ...prForm, department: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                  <select className="w-full border rounded-xl p-2 text-xs" value={prForm.priority} onChange={e => setPrForm({ ...prForm, priority: e.target.value })}>
                    <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Required By Date</label>
                  <Input type="date" value={prForm.requiredByDate} onChange={e => setPrForm({ ...prForm, requiredByDate: e.target.value })} />
                </div>
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">Line Items & Routing Destinations</p>
                  <span className="text-xs text-gray-500">{prLines.length} item(s)</span>
                </div>

                {prLines.map((l, i) => (
                  <div key={i} className="p-3 bg-gray-50/80 rounded-xl space-y-2.5 border border-gray-200 text-xs">
                    {/* Row 1: Product SKU, Description, Qty, Est. Unit Cost, Line Total, Delete */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product SKU (Optional)</label>
                        <CompactProductSelect
                          value={l.productId}
                          onChange={v => handlePrProductSelect(i, v)}
                          products={products}
                          placeholder="-- Select Existing Item --"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description *</label>
                        <Input
                          className="w-full text-xs"
                          placeholder="Item / Service description *"
                          value={l.description}
                          onChange={e => { const u = [...prLines]; u[i].description = e.target.value; setPrLines(u); }}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Qty</label>
                        <Input
                          className="w-full text-center text-xs"
                          type="number"
                          value={l.quantity}
                          onChange={e => { const u = [...prLines]; u[i].quantity = e.target.value; setPrLines(u); }}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Est. Price</label>
                        <Input
                          className="w-full text-right text-xs"
                          type="number"
                          value={l.estimatedUnitPrice}
                          onChange={e => { const u = [...prLines]; u[i].estimatedUnitPrice = e.target.value; setPrLines(u); }}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1 text-right">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total</label>
                        <span className="font-mono font-bold text-emerald-700 text-xs block py-2">
                          {money((parseFloat(l.quantity) || 0) * (parseFloat(l.estimatedUnitPrice) || 0))}
                        </span>
                      </div>
                      <div className="col-span-1 sm:col-span-1 text-center pt-4">
                        {prLines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePrLine(i)}
                            className="text-red-500 hover:text-red-700 font-bold text-base p-1"
                            title="Remove line"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Destination Routing & Target Location */}
                    <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-gray-200/60 bg-white/60 p-2 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-600">Routing Destination:</span>
                        <select
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white text-gray-800"
                          value={l.destination}
                          onChange={e => { const u = [...prLines]; u[i].destination = e.target.value as any; setPrLines(u); }}
                        >
                          <option value="Inventory">Direct Inventory Stock (Sale/Store)</option>
                          <option value="ManufacturingMaterial">Manufacturing Raw Material</option>
                          <option value="FixedAsset">Fixed Asset Register (Plant & Machinery)</option>
                          <option value="DirectExpense">Direct GL Expense Account</option>
                        </select>
                      </div>

                      {(l.destination === 'Inventory' || l.destination === 'ManufacturingMaterial') && (
                        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                          <span className="text-[11px] font-bold text-gray-600">Target Warehouse:</span>
                          <select
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white text-gray-800 flex-1"
                            value={l.targetWarehouseId || warehouses[0]?.id || ''}
                            onChange={e => { const u = [...prLines]; u[i].targetWarehouseId = e.target.value; setPrLines(u); }}
                          >
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {l.destination === 'DirectExpense' && (
                        <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
                          <span className="text-[11px] font-bold text-gray-600">Expense Account:</span>
                          <div className="flex-1">
                            <CompactSelect
                              value={l.expenseAccountId}
                              onChange={v => { const u = [...prLines]; u[i].expenseAccountId = v; setPrLines(u); }}
                              placeholder="-- Select GL Expense Account --"
                              searchPlaceholder="Search expense account..."
                              options={accounts.filter(a => a.type === 'Expense').map(a => ({
                                value: a.id,
                                label: `${a.code} - ${a.name}`,
                                badge: 'Expense'
                              }))}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {l.destination === 'FixedAsset' && (
                        <div className="text-[11px] text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md font-medium border border-purple-200">
                          📦 Will automatically be registered into the Fixed Assets module upon GRN receiving.
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="flex justify-start pt-1">
                  <Button size="sm" variant="outline" onClick={addPrLine}>+ Add Line Item</Button>
                </div>

                {prLines.length > 0 && (() => {
                  const estimatedTotal = prLines.reduce((sum, l) => sum + ((parseFloat(l.quantity) || 0) * (parseFloat(l.estimatedUnitPrice) || 0)), 0);
                  return (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
                        <div style={{ textAlign: 'right' as const, borderLeft: '2px solid #cbd5e1', paddingLeft: 20 }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase' as const, color: '#047857', fontWeight: 700, letterSpacing: '0.05em' }}>Estimated PR Total</span>
                          <p style={{ fontSize: 18, fontWeight: 800, color: '#047857', fontFamily: 'monospace', margin: '2px 0 0' }}>{money(estimatedTotal)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowPrModal(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={savePr}>Submit Purchase Request</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: Create RFQ ────────────────────────────────────────────── */}
      {showRfqModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Request for Quotation (RFQ)</h2>
                <p className="text-xs text-gray-500">Solicit formal price quotes and delivery terms from qualified suppliers.</p>
              </div>
              <button onClick={() => setShowRfqModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">* RFQ Title / Subject</label>
                  <Input value={rfqForm.title} placeholder="e.g. RFQ for High-Grade Aluminum & Bearings" onChange={e => setRfqForm({ ...rfqForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">* Quote Due Date</label>
                  <Input type="date" value={rfqForm.deadline} onChange={e => setRfqForm({ ...rfqForm, deadline: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Invited Vendors</label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                  {vendors.map(v => {
                    const isSelected = rfqForm.invitedVendorIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? rfqForm.invitedVendorIds.filter(id => id !== v.id)
                            : [...rfqForm.invitedVendorIds, v.id];
                          setRfqForm({ ...rfqForm, invitedVendorIds: updated });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${isSelected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}
                      >
                        {isSelected ? '✓ ' : '+ '} {v.name}
                      </button>
                    );
                  })}
                  {vendors.length === 0 && <span className="text-xs text-gray-400">No vendors registered.</span>}
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">Required Items & Quantities</p>
                  <Button size="sm" variant="outline" onClick={addRfqLine}>+ Add Line</Button>
                </div>
                {rfqLines.map((l, i) => (
                  <div key={i} className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <Input
                      className="flex-1 text-xs"
                      placeholder="Item description *"
                      value={l.description}
                      onChange={e => { const u = [...rfqLines]; u[i].description = e.target.value; setRfqLines(u); }}
                    />
                    <Input
                      className="w-24 text-center text-xs"
                      type="number"
                      placeholder="Qty"
                      value={l.quantity}
                      onChange={e => { const u = [...rfqLines]; u[i].quantity = e.target.value; setRfqLines(u); }}
                    />
                    <select
                      className="border rounded-lg p-1.5 text-xs font-semibold"
                      value={l.destination}
                      onChange={e => { const u = [...rfqLines]; u[i].destination = e.target.value; setRfqLines(u); }}
                    >
                      <option value="Inventory">Inventory</option>
                      <option value="ManufacturingMaterial">Mfg Material</option>
                      <option value="FixedAsset">Fixed Asset</option>
                      <option value="DirectExpense">Direct Expense</option>
                    </select>
                    {rfqLines.length > 1 && (
                      <button type="button" onClick={() => removeRfqLine(i)} className="text-red-500 font-bold px-2">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowRfqModal(false)}>Cancel</Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={saveRfq}>Issue RFQ</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: Submit Vendor Quote ────────────────────────────────────── */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Submit Vendor Quote</h2>
              <button onClick={() => setShowQuoteModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 mb-1">* Select Vendor</label>
                <CompactSelect
                  value={quoteForm.vendorId}
                  onChange={v => setQuoteForm({ ...quoteForm, vendorId: v })}
                  placeholder="-- Select Vendor --"
                  searchPlaceholder="Search vendor..."
                  options={vendors.map(v => ({
                    value: v.id,
                    label: v.name,
                    badge: v.vendorNumber || undefined
                  }))}
                  className="h-10 text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Delivery Lead Time (Days)</label>
                <Input type="number" value={quoteForm.deliveryLeadTimeDays} onChange={e => setQuoteForm({ ...quoteForm, deliveryLeadTimeDays: e.target.value })} />
              </div>
              <div className="border-t pt-3 space-y-2">
                <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">Quoted Unit Prices:</p>
                {quoteLines.map((l, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded-lg border">
                    <span className="font-medium text-gray-700">{l.description} ({l.quantity} Pcs)</span>
                    <div className="flex items-center gap-2">
                      <Input className="w-32 text-right" type="number" placeholder="Quoted Price" value={l.quotedUnitPrice} onChange={e => { const u = [...quoteLines]; u[i].quotedUnitPrice = e.target.value; setQuoteLines(u); }} />
                      <span className="w-20 text-right font-mono font-bold text-emerald-700">
                        {money((parseFloat(l.quantity) || 1) * (parseFloat(l.quotedUnitPrice) || 0))}
                      </span>
                    </div>
                  </div>
                ))}

                {quoteLines.length > 0 && (() => {
                  const quoteTotal = quoteLines.reduce((s, l) => s + ((parseFloat(l.quantity) || 1) * (parseFloat(l.quotedUnitPrice) || 0)), 0);
                  return (
                    <div className="text-right pt-2 border-t font-bold text-sm text-emerald-800">
                      Total Quoted: <span className="font-mono text-base">{money(quoteTotal)}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowQuoteModal(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveQuote}>Submit Quote</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: Create Direct PO ──────────────────────────────────────── */}
      {showPoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Direct Purchase Order (PO)</h2>
                <p className="text-xs text-gray-500">Issue an authorized commitment directly to a supplier without requiring an RFQ.</p>
              </div>
              <button onClick={() => setShowPoModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">* Select Vendor</label>
                  <CompactSelect
                    value={poForm.vendorId}
                    onChange={v => setPoForm({ ...poForm, vendorId: v })}
                    placeholder="-- Select Vendor --"
                    searchPlaceholder="Search vendor..."
                    options={vendors.map(v => ({
                      value: v.id,
                      label: v.name,
                      badge: v.vendorNumber || undefined
                    }))}
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">* Order Date</label>
                  <Input type="date" value={poForm.orderDate} onChange={e => setPoForm({ ...poForm, orderDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Expected Delivery Date</label>
                  <Input type="date" value={poForm.expectedDeliveryDate} onChange={e => setPoForm({ ...poForm, expectedDeliveryDate: e.target.value })} />
                </div>
              </div>

              <div className="border-t pt-3 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">Order Line Items & Pricing</p>
                  <Button size="sm" variant="outline" onClick={addPoLine}>+ Add Line Item</Button>
                </div>

                {poLines.map((l, i) => (
                  <div key={i} className="p-3 bg-gray-50/80 rounded-xl space-y-2 border border-gray-200 text-xs">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Product SKU (Optional)</label>
                        <CompactProductSelect
                          value={l.productId}
                          onChange={v => handlePoProductSelect(i, v)}
                          products={products}
                          placeholder="-- Select Product --"
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description *</label>
                        <Input
                          className="w-full text-xs"
                          placeholder="Item description *"
                          value={l.description}
                          onChange={e => { const u = [...poLines]; u[i].description = e.target.value; setPoLines(u); }}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Qty</label>
                        <Input
                          className="w-full text-center text-xs"
                          type="number"
                          value={l.quantity}
                          onChange={e => { const u = [...poLines]; u[i].quantity = e.target.value; setPoLines(u); }}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Unit Price</label>
                        <Input
                          className="w-full text-right text-xs"
                          type="number"
                          value={l.unitPrice}
                          onChange={e => { const u = [...poLines]; u[i].unitPrice = e.target.value; setPoLines(u); }}
                        />
                      </div>
                      <div className="col-span-3 sm:col-span-1 text-right">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total</label>
                        <span className="font-mono font-bold text-emerald-700 text-xs block py-2">
                          {money((parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0))}
                        </span>
                      </div>
                      <div className="col-span-1 sm:col-span-1 text-center pt-4">
                        {poLines.length > 1 && (
                          <button type="button" onClick={() => removePoLine(i)} className="text-red-500 font-bold p-1">×</button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center pt-2 border-t bg-white/60 p-2 rounded-lg">
                      <span className="text-[11px] font-bold text-gray-600">Routing Destination:</span>
                      <select
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-semibold bg-white"
                        value={l.destination}
                        onChange={e => { const u = [...poLines]; u[i].destination = e.target.value; setPoLines(u); }}
                      >
                        <option value="Inventory">Inventory Stock</option>
                        <option value="ManufacturingMaterial">Mfg Raw Material</option>
                        <option value="FixedAsset">Fixed Asset</option>
                        <option value="DirectExpense">Direct Expense</option>
                      </select>
                    </div>
                  </div>
                ))}

                {poLines.length > 0 && (() => {
                  const poTotal = poLines.reduce((sum, l) => sum + ((parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)), 0);
                  return (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
                        <div style={{ textAlign: 'right' as const, borderLeft: '2px solid #cbd5e1', paddingLeft: 20 }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase' as const, color: '#047857', fontWeight: 700, letterSpacing: '0.05em' }}>PO Total Amount</span>
                          <p style={{ fontSize: 18, fontWeight: 800, color: '#047857', fontFamily: 'monospace', margin: '2px 0 0' }}>{money(poTotal)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowPoModal(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={savePo}>Create Purchase Order</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: Process GRN Receiving ─────────────────────────────────── */}
      {showGrnModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Process Goods Receipt Note (GRN)</h2>
                <p className="text-xs text-gray-500">Record incoming shipments, perform quality checks, and route items to appropriate ledgers.</p>
              </div>
              <button onClick={() => setShowGrnModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">* Delivery Challan Number</label>
                  <Input value={grnForm.deliveryChallanNumber} onChange={e => setGrnForm({ ...grnForm, deliveryChallanNumber: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">* Primary Receiving Warehouse</label>
                  <select className="w-full border rounded-xl p-2.5 text-xs font-medium" value={grnForm.targetWarehouseId} onChange={e => setGrnForm({ ...grnForm, targetWarehouseId: e.target.value })}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="font-bold text-gray-800 text-xs uppercase tracking-wider">Received Items & Destination Routing:</p>
                {grnLines.map((l, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs border">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>{l.description}</span>
                      <span>Ordered Qty: {l.orderedQuantity}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                      <div>
                        <span className="font-medium text-gray-600 block text-[10px]">Received Qty:</span>
                        <Input className="w-full" type="number" value={l.receivedQuantity} onChange={e => { const u = [...grnLines]; u[i].receivedQuantity = e.target.value; setGrnLines(u); }} />
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 block text-[10px]">Rejected Qty:</span>
                        <Input className="w-full" type="number" value={l.rejectedQuantity} onChange={e => { const u = [...grnLines]; u[i].rejectedQuantity = e.target.value; setGrnLines(u); }} />
                      </div>
                      <div>
                        <span className="font-medium text-gray-600 block text-[10px]">Destination:</span>
                        <select className="border rounded-lg p-2 font-bold w-full text-xs" value={l.destination} onChange={e => { const u = [...grnLines]; u[i].destination = e.target.value as any; setGrnLines(u); }}>
                          <option value="Inventory">Inventory Stock (Sale/Store)</option>
                          <option value="ManufacturingMaterial">Manufacturing Raw Material</option>
                          <option value="FixedAsset">Fixed Asset Register</option>
                          <option value="DirectExpense">Direct GL Expense</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowGrnModal(false)}>Cancel</Button>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={saveGrn}>Process GRN & Route Items</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: Create Vendor Bill / Invoice ──────────────────────────── */}
      {showBillModal && (
        <div className="overlay">
          <form className="modal" onSubmit={e => { e.preventDefault(); saveBill(); }}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">PROCUREMENT & PAYABLES</p>
                <h2>Create New Vendor Bill / Supplier Invoice</h2>
              </div>
              <button type="button" className="close" onClick={() => setShowBillModal(false)}>
                ×
              </button>
            </div>

            <div className="form-grid">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">* Select Vendor</label>
                <CompactSelect
                  value={billForm.vendorId}
                  onChange={v => setBillForm({ ...billForm, vendorId: v })}
                  placeholder="-- Select Vendor --"
                  searchPlaceholder="Search vendor..."
                  options={vendors.map(v => ({
                    value: v.id,
                    label: v.name,
                    badge: v.vendorNumber || undefined
                  }))}
                  className="h-10 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">System Bill Number (Auto-Sequence)</label>
                <input
                  type="text"
                  readOnly
                  value={billForm.billNumber || 'Auto-generated'}
                  className="bg-gray-100 font-mono font-bold text-gray-700 w-full rounded-xl border border-gray-200 px-3 py-2 text-xs"
                />
              </div>

              <label>
                * Supplier Invoice Number
                <input required placeholder="e.g. INV-2026-991" value={billForm.vendorInvoiceNumber} onChange={e => setBillForm({ ...billForm, vendorInvoiceNumber: e.target.value })} />
              </label>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Linked Purchase Order</label>
                <CompactSelect
                  value={billForm.purchaseOrderId}
                  onChange={v => setBillForm({ ...billForm, purchaseOrderId: v })}
                  placeholder="-- Direct Bill (No PO) --"
                  searchPlaceholder="Search purchase order..."
                  clearLabel="-- Direct Bill (No PO) --"
                  options={orders.map(p => ({
                    value: p.id,
                    label: p.orderNumber || p.poNumber || 'PO',
                    badge: 'PO'
                  }))}
                  className="h-10 text-xs"
                />
              </div>

              <label>
                * Bill Date
                <input type="date" required value={billForm.date} onChange={e => setBillForm({ ...billForm, date: e.target.value })} />
              </label>

              <label>
                * Due Date
                <input type="date" required value={billForm.dueDate} onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })} />
              </label>

              <div style={{ gridColumn: '1 / -1', marginTop: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <strong style={{ fontSize: 13, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Billed Line Items & Unit Costs</strong>
                </div>

                {/* Column Headers */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 10px', marginBottom: 4 }}>
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em' }}>Description</span>
                  <span style={{ width: 80, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em', textAlign: 'center' as const }}>Qty</span>
                  <span style={{ width: 120, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em', textAlign: 'center' as const }}>Unit Price</span>
                  <span style={{ width: 80, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em', textAlign: 'center' as const }}>Tax</span>
                  <span style={{ width: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, color: '#94a3b8', letterSpacing: '0.05em', textAlign: 'right' as const }}>Amount</span>
                  <span style={{ width: 24 }}></span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {billLines.map((l, i) => {
                    const lineSubtotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
                    const lineTax = parseFloat(l.taxAmount) || 0;
                    const lineTotal = lineSubtotal + lineTax;
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <input style={{ flex: 1 }} placeholder="Item description" value={l.description} onChange={e => { const u = [...billLines]; u[i].description = e.target.value; setBillLines(u); }} />
                        <input style={{ width: 80, textAlign: 'center' }} type="number" placeholder="Qty" value={l.quantity} onChange={e => { const u = [...billLines]; u[i].quantity = e.target.value; setBillLines(u); }} />
                        <input style={{ width: 120, textAlign: 'center' }} type="number" placeholder="Billed Unit Price" value={l.unitPrice} onChange={e => { const u = [...billLines]; u[i].unitPrice = e.target.value; setBillLines(u); }} />
                        <div style={{ width: 80 }}>
                          <CompactTaxSelect
                            value={(() => {
                              const match = applicableTaxCodes.find(tc => tc.code === l.taxCode);
                              return match ? match.rate : (applicableTaxCodes[0]?.rate ?? 0);
                            })()}
                            onChange={newRate => {
                              const match = applicableTaxCodes.find(tc => tc.rate === parseFloat(newRate)) || applicableTaxCodes[0];
                              const rate = match ? match.rate : 0;
                              const taxVal = (lineSubtotal * rate) / 100;
                              const u = [...billLines];
                              u[i].taxCode = match?.code || '';
                              u[i].taxAmount = taxVal;
                              setBillLines(u);
                            }}
                            taxCodes={applicableTaxCodes}
                          />
                        </div>
                        <span style={{ width: 100, textAlign: 'right', fontWeight: 700, fontSize: 13, color: '#0f172a', fontFamily: 'monospace' }}>
                          {money(lineTotal)}
                        </span>
                        <button type="button" style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, width: 24 }} onClick={() => setBillLines(billLines.filter((_, idx) => idx !== i))}>
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 10 }}>
                  <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => {
                    setBillLines([...billLines, { description: '', quantity: 1, unitPrice: 0, taxCode: applicableTaxCodes[0]?.code, taxAmount: 0, destination: 'Expense' }]);
                  }}>
                    + Add Line Item
                  </button>
                </div>

                {/* Bill Totals Summary */}
                {billLines.length > 0 && (() => {
                  const subtotal = billLines.reduce((sum, l) => sum + ((parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)), 0);
                  const taxTotal = billLines.reduce((sum, l) => sum + (parseFloat(l.taxAmount) || 0), 0);
                  const grandTotal = subtotal + taxTotal;
                  return (
                    <div style={{ marginTop: 12, padding: '12px 16px', background: '#f1f5f9', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 40 }}>
                        <div style={{ textAlign: 'right' as const }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase' as const, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>Subtotal</span>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#334155', fontFamily: 'monospace', margin: '2px 0 0' }}>{money(subtotal)}</p>
                        </div>
                        <div style={{ textAlign: 'right' as const }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase' as const, color: '#dc2626', fontWeight: 600, letterSpacing: '0.05em' }}>Tax (VAT/GST/Sales Tax)</span>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace', margin: '2px 0 0' }}>{money(taxTotal)}</p>
                        </div>
                        <div style={{ textAlign: 'right' as const, borderLeft: '2px solid #cbd5e1', paddingLeft: 20 }}>
                          <span style={{ fontSize: 11, textTransform: 'uppercase' as const, color: '#047857', fontWeight: 700, letterSpacing: '0.05em' }}>Grand Total</span>
                          <p style={{ fontSize: 18, fontWeight: 800, color: '#047857', fontFamily: 'monospace', margin: '2px 0 0' }}>{money(grandTotal)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary" onClick={() => setShowBillModal(false)}>Cancel</button>
              <button type="submit" className="primary">Create Vendor Bill & Validate Match</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL 7: Warehouse Stock Transfer ─────────────────────────────── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Inter-Warehouse Stock Transfer</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700 mb-1">* Product</label>
                <CompactProductSelect
                  value={transferForm.productId}
                  onChange={v => setTransferForm({ ...transferForm, productId: v })}
                  products={products}
                  placeholder="-- Select Item --"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">* Source Warehouse</label>
                  <CompactSelect
                    value={transferForm.sourceWarehouseId}
                    onChange={v => setTransferForm({ ...transferForm, sourceWarehouseId: v })}
                    placeholder="-- Select Source --"
                    searchPlaceholder="Search warehouse..."
                    options={warehouses.map(w => ({
                      value: w.id,
                      label: w.name,
                      badge: 'Warehouse'
                    }))}
                    className="h-10 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">* Target Warehouse</label>
                  <CompactSelect
                    value={transferForm.destinationWarehouseId}
                    onChange={v => setTransferForm({ ...transferForm, destinationWarehouseId: v })}
                    placeholder="-- Select Target --"
                    searchPlaceholder="Search warehouse..."
                    options={warehouses.map(w => ({
                      value: w.id,
                      label: w.name,
                      badge: 'Warehouse'
                    }))}
                    className="h-10 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Transfer Quantity</label>
                <Input type="number" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })} />
              </div>
              <div>
                <label className="block font-medium text-gray-700 mb-1">Reason / Note</label>
                <Input value={transferForm.reason} onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowTransferModal(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={saveTransfer}>Execute Transfer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
