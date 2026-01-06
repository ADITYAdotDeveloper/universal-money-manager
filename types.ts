export type TransactionType = 'INCOME' | 'EXPENSE' | 'DONATION' | 'DEBT';

export type DebtSubtype = 'GOOD' | 'BAD' | null;

export interface Transaction {
  id: string;
  date: string; // ISO string
  amount: number;
  type: TransactionType;
  category: string;
  debtSubtype?: DebtSubtype;
  note?: string;
  isRepayment?: boolean; // New flag to explicitly track repayments
}

export interface CategoryMap {
  INCOME: string[];
  EXPENSE: string[];
  DONATION: string[];
  DEBT: string[];
}

export type TimeView = 'MONTHLY' | 'YEARLY';
export type ViewMode = 'HOME' | 'MONTH' | 'YEAR';

// For the summary breakdown
export interface CategorySummary {
  category: string;
  total: number;
  percentage: number;
}