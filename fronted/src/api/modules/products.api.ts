import { apiClient } from '../client';

export interface Product {
  id: string;
  itemCode?: string;
  code?: string;
  name: string;
  description?: string;
  type: any;
  category?: string;
  salesPrice?: number;
  unitPrice?: number;
  purchaseCost?: number;
  costPrice?: number;
  unitOfMeasure?: string;
  unit?: string;
  salesAccountId?: string;
  incomeAccountId?: string;
  expenseAccountId?: string;
  assetAccountId?: string;
  taxCodeId?: string;
  status?: any;
  companyId?: string;
}

export const productsApi = {
  getProducts: async (companyId?: string): Promise<Product[]> => {
    return apiClient<Product[]>('/products', {
      params: { companyId },
    });
  },

  getNextProductCode: async (): Promise<{ code: string }> => {
    return apiClient<{ code: string }>('/products/next-code');
  },

  saveProduct: async (productData: any, id?: string): Promise<Product> => {
    const endpoint = id ? `/products/${id}` : '/products';
    const method = id ? 'PUT' : 'POST';
    return apiClient<Product>(endpoint, {
      method,
      body: productData,
    });
  },

  deleteProduct: async (id: string): Promise<void> => {
    return apiClient(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  setProductPurpose: async (id: string, purpose: string): Promise<Product> => {
    return apiClient<Product>(`/products/${id}/purpose`, {
      method: 'PATCH',
      body: { purpose },
    });
  },
};
