import { CategoryMap, TransactionType } from './types';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Heart, 
  CreditCard 
} from 'lucide-react';

export const DEFAULT_CATEGORIES: CategoryMap = {
  INCOME: ['Allowance', 'Salary', 'Freelance'],
  EXPENSE: ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills'],
  DONATION: ['Charity', 'Gift', 'Religious'],
  DEBT: ['Good Debt', 'Bad Debt'], // Fixed, but structure kept for consistency
};

export const TYPE_CONFIG = {
  INCOME: {
    label: 'Income',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: ArrowUpCircle,
    theme: 'emerald'
  },
  EXPENSE: {
    label: 'Expense',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    icon: ArrowDownCircle,
    theme: 'rose'
  },
  DONATION: {
    label: 'Donation',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Heart,
    theme: 'purple'
  },
  DEBT: {
    label: 'Debt',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: CreditCard,
    theme: 'slate'
  }
};

export const CURRENCY_SYMBOL = '₹';