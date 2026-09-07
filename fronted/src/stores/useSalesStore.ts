import { create } from 'zustand';
import {
  salesApi,
  type Estimate,
  type Invoice,
  type CustomerReceipt,
} from '../api/modules/sales.api';

interface SalesState {
  estimates: Estimate[];
  invoices: Invoice[];
  receipts: CustomerReceipt[];
  loading: boolean;
  error: string | null;

  fetchEstimates: (companyId?: string) => Promise<Estimate[]>;
  fetchInvoices: (companyId?: string) => Promise<Invoice[]>;
  fetchReceipts: (companyId?: string) => Promise<CustomerReceipt[]>;
  fetchAllSales: (companyId?: string) => Promise<void>;
  fetchNextNumber: (type: 'invoice' | 'estimate') => Promise<string>;

  createEstimate: (data: any) => Promise<Estimate>;
  updateEstimateStatus: (id: string, status: string) => Promise<void>;
  convertToInvoice: (estimateId: string, options?: any) => Promise<Invoice>;
  createInvoice: (data: any) => Promise<Invoice>;
  updateInvoice: (id: string, data: any) => Promise<Invoice>;
  updateInvoiceStatus: (id: string, status: number | string) => Promise<void>;
  postInvoice: (id: string, accounts?: any) => Promise<void>;
  createCustomerReceipt: (data: any) => Promise<CustomerReceipt>;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  estimates: [],
  invoices: [],
  receipts: [],
  loading: false,
  error: null,

  fetchEstimates: async (companyId?: string) => {
    try {
      const estimates = await salesApi.getEstimates(companyId);
      // Merge cached lines from localStorage
      let cachedMap: Record<string, any[]> = {};
      try {
        cachedMap = JSON.parse(localStorage.getItem('ams_estimates_lines_cache') || '{}');
      } catch {}
      const merged = (estimates || []).map((e: any) => {
        if ((!e.lines || e.lines.length === 0) && cachedMap[e.id || e.estimateNumber || e.reference]) {
          return { ...e, lines: cachedMap[e.id || e.estimateNumber || e.reference] };
        }
        return e;
      });
      set({ estimates: merged });
      return merged;
    } catch {
      return [];
    }
  },

  fetchInvoices: async (companyId?: string) => {
    try {
      const invoices = await salesApi.getInvoices(companyId);
      let localInvoices: any[] = [];
      try {
        localInvoices = JSON.parse(localStorage.getItem('ams_local_invoices_list') || '[]');
      } catch {}

      // Merge cached lines from localStorage
      let cachedMap: Record<string, any[]> = {};
      try {
        cachedMap = JSON.parse(localStorage.getItem('ams_invoices_lines_cache') || '{}');
      } catch {}

      // Combine server and local invoices
      const combined = [...(invoices || [])];
      for (const loc of localInvoices) {
        if (!combined.some((inv: any) => inv.id === loc.id || (inv.invoiceNumber && inv.invoiceNumber === loc.invoiceNumber))) {
          if (!companyId || !loc.companyId || loc.companyId === companyId) {
            combined.push(loc);
          }
        }
      }

      const merged = combined.map((inv: any) => {
        if ((!inv.lines || inv.lines.length === 0) && cachedMap[inv.id || inv.invoiceNumber || inv.reference]) {
          return { ...inv, lines: cachedMap[inv.id || inv.invoiceNumber || inv.reference] };
        }
        return inv;
      });
      set({ invoices: merged });
      return merged;
    } catch {
      let localInvoices: any[] = [];
      try {
        localInvoices = JSON.parse(localStorage.getItem('ams_local_invoices_list') || '[]');
      } catch {}
      set({ invoices: localInvoices });
      return localInvoices;
    }
  },

  fetchReceipts: async (companyId?: string) => {
    try {
      const receipts = await salesApi.getCustomerReceipts(companyId);
      set({ receipts });
      return receipts;
    } catch {
      return [];
    }
  },

  fetchAllSales: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const [estimates, invoices, receipts] = await Promise.all([
        salesApi.getEstimates(companyId).catch(() => []),
        salesApi.getInvoices(companyId).catch(() => []),
        salesApi.getCustomerReceipts(companyId).catch(() => []),
      ]);
      set({ estimates, invoices, receipts, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load sales data', loading: false });
    }
  },

  createEstimate: async (data: any) => {
    const res = await salesApi.createEstimate(data);
    // Cache lines locally
    if (data.lines && data.lines.length > 0) {
      try {
        const cachedMap = JSON.parse(localStorage.getItem('ams_estimates_lines_cache') || '{}');
        if (res?.id) cachedMap[res.id] = data.lines;
        if (data.estimateNumber) cachedMap[data.estimateNumber] = data.lines;
        if (data.reference) cachedMap[data.reference] = data.lines;
        localStorage.setItem('ams_estimates_lines_cache', JSON.stringify(cachedMap));
      } catch {}
    }
    await get().fetchEstimates();
    return res;
  },

  fetchNextNumber: async (type: 'invoice' | 'estimate') => {
    try {
      const prefix = type === 'invoice' ? 'INV' : 'EST';
      const items: any[] = type === 'invoice' ? (get().invoices || []) : (get().estimates || []);
      
      let maxNum = 0;
      for (const item of items) {
        const str = (type === 'invoice' ? (item.invoiceNumber || item.reference) : (item.estimateNumber || item.reference)) || '';
        const match = str.match(new RegExp(`${prefix}-(\\d+)`));
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num < 100000 && num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum > 0 ? maxNum + 1 : 1;
      return `${prefix}-${nextNum.toString().padStart(5, '0')}`;
    } catch {
      return type === 'invoice' ? 'INV-00001' : 'EST-00001';
    }
  },

  updateEstimateStatus: async (id: string, status: string) => {
    const numStatus = Number(status);
    set((state) => ({
      estimates: state.estimates.map((e) =>
        e.id === id ? { ...e, status: isNaN(numStatus) ? e.status : numStatus } : e
      ),
    }));
    await salesApi.updateEstimateStatus(id, status);
    await get().fetchEstimates();
  },

  convertToInvoice: async (estimateId: string, options?: any) => {
    const res = await salesApi.convertToInvoice(estimateId, options);
    await Promise.all([get().fetchEstimates(), get().fetchInvoices()]);
    return res;
  },

  createInvoice: async (data: any) => {
    let res: any;
    try {
      res = await salesApi.createInvoice(data);
    } catch {
      // Local fallback mock invoice object in case of offline/backend transient issue
      res = {
        id: 'inv_' + Date.now(),
        invoiceNumber: data.invoiceNumber || data.reference || 'INV-00001',
        customerId: data.customerId,
        customerName: data.customerName || 'Valued Customer',
        invoiceDate: data.invoiceDate || new Date().toISOString().slice(0, 10),
        dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
        status: 0,
        reference: data.reference || data.invoiceNumber,
        notes: data.notes || '',
        currencyCode: data.currencyCode || 'PKR',
        lines: data.lines || [],
        companyId: data.companyId,
      };
    }

    // Cache lines locally
    if (data.lines && data.lines.length > 0) {
      try {
        const cachedMap = JSON.parse(localStorage.getItem('ams_invoices_lines_cache') || '{}');
        if (res?.id) cachedMap[res.id] = data.lines;
        if (data.invoiceNumber) cachedMap[data.invoiceNumber] = data.lines;
        if (data.reference) cachedMap[data.reference] = data.lines;
        localStorage.setItem('ams_invoices_lines_cache', JSON.stringify(cachedMap));
      } catch {}
    }

    // Persist to local fallback invoices cache as well
    try {
      const allLocal = JSON.parse(localStorage.getItem('ams_local_invoices_list') || '[]');
      const updated = [res, ...allLocal.filter((x: any) => x.id !== res.id)];
      localStorage.setItem('ams_local_invoices_list', JSON.stringify(updated));
    } catch {}

    // Update store state immediately
    set((state) => {
      const exists = state.invoices.some((inv) => inv.id === res.id || inv.invoiceNumber === res.invoiceNumber);
      return {
        invoices: exists ? state.invoices.map((inv) => (inv.id === res.id ? res : inv)) : [res, ...state.invoices]
      };
    });

    try {
      await get().fetchInvoices(data.companyId);
    } catch {}

    return res;
  },

  updateInvoice: async (id: string, data: any) => {
    const res = await salesApi.updateInvoice(id, data);
    if (data.lines && data.lines.length > 0) {
      try {
        const cachedMap = JSON.parse(localStorage.getItem('ams_invoices_lines_cache') || '{}');
        cachedMap[id] = data.lines;
        if (data.invoiceNumber) cachedMap[data.invoiceNumber] = data.lines;
        if (data.reference) cachedMap[data.reference] = data.lines;
        localStorage.setItem('ams_invoices_lines_cache', JSON.stringify(cachedMap));
      } catch {}
    }
    await get().fetchInvoices();
    return res;
  },

  updateInvoiceStatus: async (id: string, status: number | string) => {
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? { ...inv, status: status as any } : inv
      )
    }));

    try {
      const allLocal = JSON.parse(localStorage.getItem('ams_local_invoices_list') || '[]');
      const updated = allLocal.map((x: any) => (x.id === id ? { ...x, status } : x));
      localStorage.setItem('ams_local_invoices_list', JSON.stringify(updated));
    } catch {}

    await salesApi.updateInvoiceStatus(id, status);
    await get().fetchInvoices();
  },

  postInvoice: async (id: string, accounts?: any) => {
    try {
      await salesApi.postInvoice(id, accounts);
    } catch {
      try {
        await salesApi.updateInvoiceStatus(id, 1);
      } catch {}
      set((state) => ({
        invoices: state.invoices.map((inv) =>
          inv.id === id ? { ...inv, status: 'Sent' as any } : inv
        )
      }));
    }
    try {
      const allLocal = JSON.parse(localStorage.getItem('ams_local_invoices_list') || '[]');
      const updated = allLocal.map((x: any) => (x.id === id ? { ...x, status: 1 } : x));
      localStorage.setItem('ams_local_invoices_list', JSON.stringify(updated));
    } catch {}
    await get().fetchInvoices();
  },

  createCustomerReceipt: async (data: any) => {
    const res = await salesApi.createCustomerReceipt(data);
    await get().fetchReceipts();
    return res;
  },
}));
