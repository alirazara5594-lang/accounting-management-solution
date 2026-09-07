import { apiClient } from '../client';

export interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName?: string;
  date?: string;
  estimateDate?: string;
  expiryDate?: string;
  status: any;
  totalAmount: number;
  subtotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  reference?: string;
  notes?: string;
  terms?: string;
  lines?: any[];
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  date: string;
  invoiceDate?: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  amountDue: number;
  status: string;
  reference?: string;
  notes?: string;
  currencyCode?: string;
  subTotal?: number;
  discountTotal?: number;
  taxTotal?: number;
  lines?: any[];
}

export interface CustomerReceipt {
  id: string;
  receiptNumber: string;
  customerId: string;
  customerName?: string;
  date: string;
  amount: number;
  paymentMethod: string;
  bankAccountName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  reference?: string;
  memo?: string;
  status: string;
}

export const salesApi = {
  getEstimates: async (companyId?: string): Promise<Estimate[]> => {
    return apiClient<Estimate[]>('/estimates', { params: { companyId } });
  },

  createEstimate: async (data: any): Promise<Estimate> => {
    return apiClient<Estimate>('/estimates', { method: 'POST', body: data });
  },

  updateEstimateStatus: async (id: string, status: string): Promise<void> => {
    return apiClient(`/estimates/${id}/status`, { method: 'PATCH', body: { status } });
  },

  convertToInvoice: async (estimateId: string, options?: any): Promise<Invoice> => {
    return apiClient<Invoice>(`/estimates/${estimateId}/convert-to-invoice`, {
      method: 'POST',
      body: options || {},
    });
  },

  getInvoices: async (companyId?: string): Promise<Invoice[]> => {
    return apiClient<Invoice[]>('/sales-invoices', { params: { companyId } });
  },

  createInvoice: async (data: any): Promise<Invoice> => {
    return apiClient<Invoice>('/sales-invoices', { method: 'POST', body: data });
  },

  updateInvoice: async (id: string, data: any): Promise<Invoice> => {
    return apiClient<Invoice>(`/sales-invoices/${id}`, { method: 'PUT', body: data });
  },

  updateInvoiceStatus: async (id: string, status: number | string): Promise<void> => {
    return apiClient(`/sales-invoices/${id}/status`, { method: 'PATCH', body: { status: Number(status) } });
  },

  postInvoice: async (id: string, accounts?: { arAccountId?: string; revenueAccountId?: string; taxLiabilityAccountId?: string }): Promise<any> => {
    return apiClient(`/sales-invoices/${id}/post`, { method: 'POST', body: accounts || {} });
  },

  getCustomerReceipts: async (companyId?: string): Promise<CustomerReceipt[]> => {
    return apiClient<CustomerReceipt[]>('/customer-payments', { params: { companyId } });
  },

  createCustomerReceipt: async (data: any): Promise<CustomerReceipt> => {
    return apiClient<CustomerReceipt>('/customer-payments', { method: 'POST', body: data });
  },
};
