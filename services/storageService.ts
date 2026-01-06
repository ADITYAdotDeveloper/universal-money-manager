import { Transaction, CategoryMap, TransactionType } from '../types';
import { DEFAULT_CATEGORIES } from '../constants';

const STORAGE_KEY_TRANSACTIONS = 'money_manager_transactions';
const STORAGE_KEY_CATEGORIES = 'money_manager_categories';

// ---------------------------------------------------------
// PASTE YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL HERE
// ---------------------------------------------------------
const API_URL = "https://script.google.com/macros/s/AKfycbzSYJwLK5PzO3XQHgJJKxeo_7UitgfJEVw2Fd9-ryql86grQHa8u9oiYA5ywzMKudt6qg/exec"; 

const isApiConfigured = () => {
    return API_URL && API_URL.startsWith('http') && !API_URL.includes("YOUR_GOOGLE_SCRIPT_URL_HERE");
};

// Helper to strictly parse incoming data to avoid String vs Number math issues
const parseTransaction = (data: any): Transaction => {
  return {
    id: String(data.id),
    date: String(data.date),
    amount: Number(data.amount), // Force Number
    type: data.type as TransactionType,
    category: String(data.category),
    note: data.note ? String(data.note) : undefined,
    debtSubtype: data.debtSubtype || undefined,
    isRepayment: data.isRepayment === true || data.isRepayment === 'true' // Handle potential string "true" from JSON
  };
};

export const StorageService = {
  /**
   * Loads data from LocalStorage
   */
  getTransactions: (): Transaction[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.map(parseTransaction) : [];
    } catch (e) {
      console.error("Failed to load local transactions", e);
      return [];
    }
  },

  /**
   * Fetches latest data from Google Sheets and updates LocalStorage
   * If fail, returns local data silently.
   */
  syncWithCloud: async (): Promise<{ transactions: Transaction[], categories: CategoryMap | null }> => {
    const localTransactions = StorageService.getTransactions();
    const localCategories = StorageService.getCategories();

    if (!isApiConfigured()) {
        return { transactions: localTransactions, categories: localCategories };
    }

    try {
      // Attempt to fetch
      // Added credentials: 'omit' and redirect: 'follow' which are often needed for GAS Web Apps
      const response = await fetch(`${API_URL}?action=get`, {
        method: 'GET',
        credentials: 'omit',
        redirect: 'follow'
      });
      
      const data = await response.json();

      if (data.status === 'success') {
        // Data from sheets is Oldest -> Newest (Row 1 to Row N).
        // We reverse it to get Newest -> Oldest, matching our local 'prepend' strategy.
        const transactions = data.transactions.reverse().map(parseTransaction);

        // Update Local Cache on success
        localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
        if (data.categories) {
          localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(data.categories));
        }
        return { 
          transactions: transactions, 
          categories: data.categories 
        };
      } else {
        console.error("Cloud Sync Error:", data.message);
      }
    } catch (error) {
      console.warn("Cloud Sync skipped (Offline or Error):", error);
    }
    
    // Fallback to local
    return { transactions: localTransactions, categories: localCategories };
  },

  saveTransaction: async (transaction: Transaction): Promise<Transaction[]> => {
    // 1. UPDATE LOCAL STORAGE IMMEDIATELY (Optimistic UI)
    const current = StorageService.getTransactions();
    const existingIndex = current.findIndex(t => t.id === transaction.id);
    let updated = [];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = transaction;
    } else {
      updated = [transaction, ...current]; // Prepend (Newest First)
    }
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updated));

    // 2. ATTEMPT CLOUD SYNC IN BACKGROUND
    if (isApiConfigured()) {
      const payload = {
        id: transaction.id,
        date: transaction.date,
        amount: Number(transaction.amount),
        type: transaction.type,
        category: transaction.category,
        note: transaction.note || "",
        debtSubtype: transaction.debtSubtype || "", 
        isRepayment: !!transaction.isRepayment
      };

      // Added credentials: 'omit' and redirect: 'follow'
      fetch(`${API_URL}?action=save`, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        credentials: 'omit',
        redirect: 'follow'
      }).then(res => res.json())
        .then(data => {
            if (data.status !== 'success') console.warn("Cloud save reported error", data);
        })
        .catch(e => console.warn("Cloud save failed (Offline)", e));
    }

    return updated;
  },

  deleteTransaction: async (id: string): Promise<Transaction[]> => {
    // 1. UPDATE LOCAL STORAGE IMMEDIATELY
    const current = StorageService.getTransactions();
    const updated = current.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(updated));

    // 2. ATTEMPT CLOUD SYNC IN BACKGROUND
    if (isApiConfigured()) {
      fetch(`${API_URL}?action=delete&id=${id}`, { 
          method: 'POST',
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          credentials: 'omit',
          redirect: 'follow'
      }).catch(e => console.warn("Cloud delete failed (Offline)", e));
    }

    return updated;
  },

  getCategories: (): CategoryMap => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  },

  addCategory: async (type: TransactionType, name: string): Promise<CategoryMap> => {
    const current = StorageService.getCategories();
    if (current[type].includes(name)) return current;

    // 1. Update Local
    const updated = {
      ...current,
      [type]: [...current[type], name]
    };
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(updated));

    // 2. Attempt Cloud Sync
    if (isApiConfigured()) {
      fetch(`${API_URL}?action=addCategory`, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ type, name }),
          credentials: 'omit',
          redirect: 'follow'
      }).catch(e => console.warn("Category sync failed", e));
    }

    return updated;
  }
};