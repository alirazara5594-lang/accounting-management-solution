import { create } from 'zustand';
import { productsApi, type Product } from '../api/modules/products.api';

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;

  fetchProducts: (companyId?: string) => Promise<Product[]>;
  fetchNextCode: () => Promise<string>;
  saveProduct: (data: any, id?: string) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  setProductPurpose: (id: string, purpose: string) => Promise<Product>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async (companyId?: string) => {
    set({ loading: true, error: null });
    try {
      const products = await productsApi.getProducts(companyId);
      set({ products, loading: false });
      return products;
    } catch (err: any) {
      set({ error: err.message || 'Failed to load products', loading: false });
      return [];
    }
  },

  fetchNextCode: async () => {
    try {
      const res = await productsApi.getNextProductCode();
      return res.code;
    } catch {
      return '';
    }
  },

  saveProduct: async (data: any, id?: string) => {
    set({ loading: true, error: null });
    try {
      const saved = await productsApi.saveProduct(data, id);
      await get().fetchProducts();
      return saved;
    } catch (err: any) {
      set({ error: err.message || 'Failed to save product', loading: false });
      throw err;
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await productsApi.deleteProduct(id);
      await get().fetchProducts();
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete product', loading: false });
      throw err;
    }
  },

  setProductPurpose: async (id: string, purpose: string) => {
    set({ loading: true, error: null });
    try {
      const updated = await productsApi.setProductPurpose(id, purpose);
      await get().fetchProducts();
      return updated;
    } catch (err: any) {
      set({ error: err.message || 'Failed to update product purpose', loading: false });
      throw err;
    }
  },
}));
