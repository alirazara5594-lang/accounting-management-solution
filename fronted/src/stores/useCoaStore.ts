import { create } from 'zustand';
import { coaApi, type Account, type AccountMapping } from '../api/modules/coa.api';

const isDemoMode = () => typeof window !== 'undefined' && localStorage.getItem('ab_demo_mode') === 'true';

interface CoaState {
  accounts: Account[];
  mappings: AccountMapping[];
  loading: boolean;
  error: string | null;

  fetchAccounts: () => Promise<Account[]>;
  saveAccount: (accountData: any, id?: string) => Promise<Account>;
  toggleAccountStatus: (account: Account) => Promise<void>;
  toggleAccountSecurity: (account: Account) => Promise<void>;
  getNextCode: (type: string, parentId?: string) => Promise<string>;
  clearAllAccounts: () => Promise<void>;
  fetchMappings: () => Promise<AccountMapping[]>;
  saveMapping: (mappingKey: string, accountId: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
}

export const useCoaStore = create<CoaState>((set, get) => ({
  accounts: [],
  mappings: [],
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await coaApi.getAccounts();
      set({ accounts, loading: false });
      return accounts;
    } catch (err: any) {
      set({ error: err.message || 'Failed to load chart of accounts', loading: false });
      return [];
    }
  },

  saveAccount: async (accountData: any, id?: string) => {
    set({ loading: true, error: null });
    try {
      const saved = await coaApi.saveAccount(accountData, id);
      set(state => {
        const targetId = id || saved?.id;
        const exists = state.accounts.some(a => a.id === targetId);
        const updatedAccounts = exists
          ? state.accounts.map(a => a.id === targetId ? { ...a, ...accountData, ...(saved || {}) } : a)
          : [...state.accounts, (saved || { id: targetId, ...accountData })];
        return { accounts: updatedAccounts, loading: false };
      });
      await get().fetchAccounts();
      return saved;
    } catch (err: any) {
      set({ error: err.message || 'Failed to save account', loading: false });
      throw err;
    }
  },

  toggleAccountStatus: async (account: Account) => {
    set({ loading: true, error: null });
    try {
      const newStatus = account.status === 'Active' ? 'Inactive' : 'Active';
      set(state => ({
        accounts: state.accounts.map(a => a.id === account.id ? { ...a, status: newStatus } : a)
      }));
      await coaApi.toggleAccountStatus(account.id, newStatus);
      await get().fetchAccounts();
    } catch (err: any) {
      set({ error: err.message || 'Failed to toggle status', loading: false });
      throw err;
    }
  },

  toggleAccountSecurity: async (account: Account) => {
    set({ loading: true, error: null });
    try {
      const updated = {
        ...account,
        isSystem: !account.isSystem,
      };
      await coaApi.saveAccount(updated, account.id);
      await get().fetchAccounts();
    } catch (err: any) {
      set({ error: err.message || 'Failed to toggle account security', loading: false });
      throw err;
    }
  },

  getNextCode: async (type: string, parentId?: string) => {
    try {
      const res = await coaApi.getNextAccountCode(type, parentId);
      return res.code;
    } catch {
      return '';
    }
  },

  clearAllAccounts: async () => {
    set({ loading: true, error: null });
    try {
      await coaApi.clearAllAccounts();
      await get().fetchAccounts();
    } catch (err: any) {
      set({ error: err.message || 'Failed to clear accounts', loading: false });
      throw err;
    }
  },

  fetchMappings: async () => {
    try {
      const mappings = await coaApi.getMappings();
      set({ mappings });
      return mappings;
    } catch (err: any) {
      console.error('Failed to load account mappings', err);
      return [];
    }
  },

  saveMapping: async (mappingKey: string, accountId: string) => {
    set({ loading: true, error: null });
    try {
      await coaApi.saveMapping(mappingKey, accountId);
      await get().fetchMappings();
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to save mapping', loading: false });
      throw err;
    }
  },

  resetDatabase: async () => {
    set({ loading: true, error: null });
    try {
      // Always attempt a real backend wipe — never skip it in demo mode,
      // otherwise server-side records (products, quotes, invoices...) survive.
      await coaApi.resetDatabase();
      await get().fetchAccounts();
      set({ loading: false });
    } catch (err: any) {
      // Fall back to client-side-only reset when the backend is unreachable (demo mode).
      if (isDemoMode()) {
        set({ accounts: [], mappings: [], loading: false });
        return;
      }
      set({ error: err.message || 'Failed to reset database', loading: false });
      throw err;
    }
  },
}));
