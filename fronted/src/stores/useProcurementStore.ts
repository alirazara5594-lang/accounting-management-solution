import { create } from 'zustand';
import { procurementApi } from '../api';
import type {
  PurchaseRequest,
  RequestForQuotation,
  VendorQuote,
  GoodsReceiptNote,
  ThreeWayMatchResult,
  StockTransfer
} from '../api';

interface ProcurementState {
  requests: PurchaseRequest[];
  rfqs: RequestForQuotation[];
  vendorQuotes: VendorQuote[];
  orders: any[];
  grns: GoodsReceiptNote[];
  receipts: GoodsReceiptNote[];
  bills: any[];
  transfers: StockTransfer[];
  loading: boolean;
  error: string | null;

  fetchRequests: (companyId?: string) => Promise<PurchaseRequest[]>;
  createRequest: (data: any) => Promise<PurchaseRequest>;
  createPurchaseRequest: (data: any) => Promise<PurchaseRequest>;
  fetchRfqs: (companyId?: string) => Promise<RequestForQuotation[]>;
  createRfq: (data: any) => Promise<RequestForQuotation>;
  fetchVendorQuotes: (rfqId?: string, companyId?: string) => Promise<VendorQuote[]>;
  submitVendorQuote: (data: any) => Promise<VendorQuote>;
  selectVendorQuote: (id: string, companyId?: string) => Promise<void>;
  fetchOrders: (companyId?: string) => Promise<any[]>;
  createOrder: (data: any) => Promise<any>;
  createPurchaseOrder: (data: any) => Promise<any>;
  fetchGrns: (companyId?: string) => Promise<GoodsReceiptNote[]>;
  fetchReceipts: (companyId?: string) => Promise<GoodsReceiptNote[]>;
  receiveGrn: (data: any, companyId?: string) => Promise<void>;
  createGoodsReceipt: (data: any, companyId?: string) => Promise<void>;
  fetchBills: (companyId?: string) => Promise<any[]>;
  createVendorBill: (data: any, companyId?: string) => Promise<any>;
  validateThreeWayMatch: (poId: string) => Promise<ThreeWayMatchResult | null>;
  fetchTransfers: (companyId?: string) => Promise<StockTransfer[]>;
  createTransfer: (data: any, companyId?: string) => Promise<void>;
  fetchAllProcurement: (companyId?: string) => Promise<void>;
}

export const useProcurementStore = create<ProcurementState>((set, get) => ({
  requests: [],
  rfqs: [],
  vendorQuotes: [],
  orders: [],
  grns: [],
  receipts: [],
  bills: [],
  transfers: [],
  loading: false,
  error: null,

  fetchRequests: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const requests = await procurementApi.getRequests(companyId);
      set({ requests, loading: false });
      return requests;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch PRs', loading: false });
      return [];
    }
  },

  createRequest: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const created = await procurementApi.createRequest(data);
      await get().fetchRequests(data.companyId);
      set({ loading: false });
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create PR', loading: false });
      throw err;
    }
  },

  createPurchaseRequest: async (data: any) => {
    return get().createRequest(data);
  },

  fetchRfqs: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const rfqs = await procurementApi.getRfqs(companyId);
      set({ rfqs, loading: false });
      return rfqs;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch RFQs', loading: false });
      return [];
    }
  },

  createRfq: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const created = await procurementApi.createRfq(data);
      await get().fetchRfqs(data.companyId);
      set({ loading: false });
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create RFQ', loading: false });
      throw err;
    }
  },

  fetchVendorQuotes: async (rfqId?: string, companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const vendorQuotes = await procurementApi.getVendorQuotes(rfqId, companyId);
      set({ vendorQuotes, loading: false });
      return vendorQuotes;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch Vendor Quotes', loading: false });
      return [];
    }
  },

  submitVendorQuote: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const created = await procurementApi.submitVendorQuote(data);
      await get().fetchVendorQuotes(data.rfqId, data.companyId);
      set({ loading: false });
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to submit quote', loading: false });
      throw err;
    }
  },

  selectVendorQuote: async (id: string, companyId?: string) => {
    set({ loading: true, error: null });
    try {
      await procurementApi.selectVendorQuote(id);
      await Promise.all([
        get().fetchVendorQuotes(undefined, companyId),
        get().fetchOrders(companyId)
      ]);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to award vendor quote', loading: false });
      throw err;
    }
  },

  fetchOrders: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const orders = await procurementApi.getOrders(companyId);
      set({ orders, loading: false });
      return orders;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch POs', loading: false });
      return [];
    }
  },

  createOrder: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const created = await procurementApi.createOrder(data);
      await get().fetchOrders(data.companyId);
      set({ loading: false });
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create PO', loading: false });
      throw err;
    }
  },

  createPurchaseOrder: async (data: any) => {
    return get().createOrder(data);
  },

  fetchGrns: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const grns = await procurementApi.getGrns(companyId);
      set({ grns, receipts: grns, loading: false });
      return grns;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch GRNs', loading: false });
      return [];
    }
  },

  fetchReceipts: async (companyId?: string) => {
    return get().fetchGrns(companyId);
  },

  receiveGrn: async (data: any, companyId?: string) => {
    set({ loading: true, error: null });
    try {
      await procurementApi.receiveGrn(data);
      await get().fetchGrns(companyId);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to receive GRN', loading: false });
      throw err;
    }
  },

  createGoodsReceipt: async (data: any, companyId?: string) => {
    return get().receiveGrn(data, companyId);
  },

  fetchBills: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const bills = await procurementApi.getBills(companyId);
      set({ bills, loading: false });
      return bills;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch Vendor Bills', loading: false });
      return [];
    }
  },

  createVendorBill: async (data: any, companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const created = await procurementApi.createBill(data);
      await get().fetchBills(companyId);
      set({ loading: false });
      return created;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create Vendor Bill', loading: false });
      throw err;
    }
  },

  validateThreeWayMatch: async (poId: string) => {
    try {
      return await procurementApi.validateThreeWayMatch(poId);
    } catch (err: any) {
      set({ error: err.message || 'Match validation failed' });
      return null;
    }
  },

  fetchTransfers: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const transfers = await procurementApi.getTransfers(companyId);
      set({ transfers, loading: false });
      return transfers;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch Stock Transfers', loading: false });
      return [];
    }
  },

  createTransfer: async (data: any, companyId?: string) => {
    set({ loading: true, error: null });
    try {
      await procurementApi.createTransfer(data);
      await get().fetchTransfers(companyId);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to process Stock Transfer', loading: false });
      throw err;
    }
  },

  fetchAllProcurement: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchRequests(companyId),
        get().fetchRfqs(companyId),
        get().fetchVendorQuotes(undefined, companyId),
        get().fetchOrders(companyId),
        get().fetchGrns(companyId),
        get().fetchBills(companyId),
        get().fetchTransfers(companyId)
      ]);
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch procurement data', loading: false });
    }
  },
}));
