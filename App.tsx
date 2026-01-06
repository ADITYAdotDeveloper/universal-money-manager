import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from './services/storageService';
import { Transaction, CategoryMap, CategorySummary, TransactionType, ViewMode } from './types';
import { CURRENCY_SYMBOL, TYPE_CONFIG } from './constants';
import { SummaryGroup } from './components/SummaryGroup';
import { SwipeableRow } from './components/SwipeableRow';
import { AddTransactionModal } from './components/AddTransactionModal';
import { CountUp } from './components/CountUp';
import { BottomNav } from './components/BottomNav';
import { OrganicChart } from './components/OrganicChart';
import { DebtVisualizer } from './components/DebtVisualizer';
import { BreakdownSheet } from './components/BreakdownSheet';
import { Plus, Wallet, AlertCircle, Moon, Sun, Cloud, RefreshCw, ChevronDown } from 'lucide-react';

function App() {
  // --- State ---
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategoryMap>(StorageService.getCategories());
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isRepaymentMode, setIsRepaymentMode] = useState(false);

  // Breakdown State
  const [breakdownType, setBreakdownType] = useState<TransactionType | null>(null);

  // --- Effects ---
  useEffect(() => {
    const initData = async () => {
      // 1. Load Local Cache Immediately
      setTransactions(StorageService.getTransactions());
      
      // 2. Sync with Cloud
      setIsSyncing(true);
      const cloudData = await StorageService.syncWithCloud();
      setTransactions(cloudData.transactions);
      if (cloudData.categories) {
        setCategories(cloudData.categories);
      }
      setIsSyncing(false);
    };

    initData();
    
    // Load Theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // --- Derived State (Summary Logic) ---
  const { filteredTransactions, summary, debtStats } = useMemo(() => {
    const now = new Date();
    
    // 1. Filter Transactions based on ViewMode (Month/Year)
    let filterFn = (t: Transaction) => {
        const tDate = new Date(t.date);
        if (viewMode === 'YEAR') {
            return tDate.getFullYear() === now.getFullYear();
        }
        // For Home and Month, default to Month
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    };

    const filtered = transactions.filter(filterFn).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Calculate Totals (Income, Expense, Donation)
    // Debt is excluded from standard summary logic
    const init = {
      INCOME: { total: 0, categories: {} as Record<string, number> },
      EXPENSE: { total: 0, categories: {} as Record<string, number> },
      DONATION: { total: 0, categories: {} as Record<string, number> },
    };

    filtered.forEach(t => {
      if (t.type === 'DEBT') return; // Skip debt for standard columns
      const val = Number(t.amount); // Force number
      init[t.type].total += val;
      init[t.type].categories[t.category] = (init[t.type].categories[t.category] || 0) + val;
    });

    // Helper to format category breakdown
    const formatBreakdown = (type: Exclude<TransactionType, 'DEBT'>): CategorySummary[] => {
      const typeData = init[type];
      return Object.entries(typeData.categories)
        .map(([cat, amount]) => ({
          category: cat,
          total: amount,
          percentage: typeData.total > 0 ? (amount / typeData.total) * 100 : 0
        }))
        .sort((a, b) => b.total - a.total);
    };

    const visualSummary = {
      INCOME: { total: init.INCOME.total, breakdown: formatBreakdown('INCOME') },
      EXPENSE: { total: init.EXPENSE.total, breakdown: formatBreakdown('EXPENSE') },
      DONATION: { total: init.DONATION.total, breakdown: formatBreakdown('DONATION') },
      NET: init.INCOME.total - init.EXPENSE.total - init.DONATION.total
    };

    // 3. Calculate Debt Stats (Global)
    let totalDebt = 0;
    let paidDebt = 0;

    transactions.forEach(t => {
      if (t.type === 'DEBT') {
        const val = Number(t.amount); // Ensure numeric math
        if (val < 0 || t.isRepayment) {
            paidDebt += Math.abs(val);
        } else {
            totalDebt += val;
        }
      }
    });

    return {
      filteredTransactions: filtered,
      summary: visualSummary,
      debtStats: { total: totalDebt, paid: paidDebt, remaining: Math.max(0, totalDebt - paidDebt) }
    };
  }, [transactions, viewMode]);

  // --- Handlers ---
  const handleSaveTransaction = async (t: Transaction) => {
    setIsSyncing(true);
    try {
      const updated = await StorageService.saveTransaction(t);
      setTransactions(updated);
    } catch (error) {
      alert("Failed to sync with Google Sheets. Please check your internet connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this entry?")) {
      setIsSyncing(true);
      try {
        const updated = await StorageService.deleteTransaction(id);
        setTransactions(updated);
      } catch (error) {
        alert("Failed to delete from Google Sheets. Please check your internet connection.");
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    // Determine repayment mode correctly from type and amount
    const isRepayment = !!t.isRepayment || (t.type === 'DEBT' && t.amount < 0);
    setIsRepaymentMode(isRepayment);
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setIsRepaymentMode(false);
    setIsModalOpen(true);
  };

  const handleReduceDebt = () => {
    setEditingTransaction(null);
    setIsRepaymentMode(true);
    setIsModalOpen(true);
  }
  
  const handleSectionClick = (type: TransactionType) => {
    setBreakdownType(type);
  }

  const handleAddCategory = async (updatedCategories: CategoryMap) => {
      setCategories(updatedCategories);
  }

  // Determine current time label
  const timeLabel = viewMode === 'YEAR' ? 'This Year' : 'This Month';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 font-sans selection:bg-blue-100 transition-colors duration-300">
      
      {/* --- Header (Net Balance) --- */}
      <header className="bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] transition-colors duration-300">
        <div className="max-w-md mx-auto px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{timeLabel} Balance</p>
                 {isSyncing && <RefreshCw size={12} className="text-blue-500 animate-spin" />}
              </div>
              <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">
                {viewMode === 'HOME' ? (
                  <span>
                    {CURRENCY_SYMBOL} {summary.NET.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, 'X')}
                  </span>
                ) : (
                  <CountUp end={summary.NET} prefix={CURRENCY_SYMBOL} />
                )}
              </h1>
              {/* Remaining Debt Label below Net Balance */}
              <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 py-1 px-3 rounded-full inline-flex">
                 <span>Debt:</span>
                 <span className="text-slate-700 dark:text-slate-200 font-bold">
                    <CountUp end={debtStats.remaining} prefix={CURRENCY_SYMBOL} />
                 </span>
              </div>
            </div>
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="max-w-md mx-auto px-4 pt-6 space-y-8">
        
        {/* --- View 1: HOME (List Focused) --- */}
        {viewMode === 'HOME' && (
          <div className="animate-fade-in">
             {/* Debt Visualizer (Separate Section) - Centered Viewport */}
             <section className="min-h-[70vh] flex flex-col justify-center pb-12">
                <DebtVisualizer 
                  totalDebt={debtStats.total} 
                  paidDebt={debtStats.paid} 
                  onReduceDebt={handleReduceDebt} 
                />
                <div className="mt-8 flex justify-center animate-bounce text-slate-300 dark:text-slate-700">
                  <ChevronDown size={24} />
                </div>
             </section>

             {/* Standard Summary Cards (Income, Expense, Donation) */}
             <section className="space-y-3 mb-8">
               <SummaryGroup type="INCOME" total={summary.INCOME.total} categories={summary.INCOME.breakdown} />
               <SummaryGroup type="EXPENSE" total={summary.EXPENSE.total} categories={summary.EXPENSE.breakdown} />
               <SummaryGroup type="DONATION" total={summary.DONATION.total} categories={summary.DONATION.breakdown} />
             </section>

             {/* Recent Transactions List */}
             <section>
              <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Transactions</h3>
              </div>
              
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed">
                  <div className="bg-slate-50 dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Wallet className="text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-slate-400 dark:text-slate-500 font-medium text-sm">No transactions yet</p>
                  <button onClick={handleOpenAdd} className="text-slate-900 dark:text-white text-sm font-bold mt-2">Add Entry</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map(t => (
                    <SwipeableRow 
                      key={t.id} 
                      onDelete={() => handleDelete(t.id)} 
                      onEdit={() => handleEdit(t)}
                    >
                      <div className="p-4 flex items-center justify-between border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${TYPE_CONFIG[t.type].bgColor} dark:bg-opacity-10`}>
                            {React.createElement(TYPE_CONFIG[t.type].icon, { size: 18, className: TYPE_CONFIG[t.type].color })}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                {t.type === 'DEBT' 
                                  ? (t.amount < 0 || t.isRepayment ? 'Debt Repayment' : t.category) 
                                  : t.category}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{new Date(t.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className={`text-base font-bold ${t.type === 'DEBT' ? 'text-slate-600 dark:text-slate-400' : TYPE_CONFIG[t.type].color}`}>
                          {t.type === 'INCOME' || (t.type === 'DEBT' && t.amount > 0 && !t.isRepayment) ? '+' : '-'} {CURRENCY_SYMBOL}{Math.abs(t.amount).toLocaleString()}
                        </div>
                      </div>
                    </SwipeableRow>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* --- View 2 & 3: MONTH & YEAR (Insights Focused) --- */}
        {(viewMode === 'MONTH' || viewMode === 'YEAR') && (
          <div className="animate-fade-in space-y-8">
            
            {/* Organic Visualization */}
            <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-100 dark:border-slate-800 min-h-[400px] flex flex-col justify-center">
               <h3 className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Cash Flow Distribution</h3>
               <OrganicChart 
                  income={summary.INCOME.total} 
                  expense={summary.EXPENSE.total} 
                  donation={summary.DONATION.total} 
                  onSectionClick={handleSectionClick}
               />
            </section>

            {/* Debt Visualizer (Also present here as per rule #6) */}
            <section>
                <DebtVisualizer 
                  totalDebt={debtStats.total} 
                  paidDebt={debtStats.paid} 
                  onReduceDebt={handleReduceDebt} 
                />
             </section>
          </div>
        )}

        {/* Disclaimer / Footer */}
        <section className="pb-8 text-center px-4 opacity-50">
          <div className="inline-flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            <Cloud size={10} />
            <span>Google Sheets Sync Active</span>
          </div>
        </section>

      </main>

      {/* --- Floating Action Button --- */}
      <div className="fixed bottom-24 right-6 z-30">
        <button 
          onClick={handleOpenAdd}
          className="bg-slate-900 dark:bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-slate-400 dark:shadow-slate-900 active:scale-90 transition-transform hover:bg-slate-800 dark:hover:bg-emerald-500"
          aria-label="Add Transaction"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* --- Bottom Navigation --- */}
      <BottomNav currentView={viewMode} onChange={setViewMode} />

      {/* --- Modals & Sheets --- */}
      <AddTransactionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        existingTransaction={editingTransaction}
        categories={categories}
        setCategories={handleAddCategory}
        isRepaymentMode={isRepaymentMode}
      />

      <BreakdownSheet 
        isOpen={!!breakdownType}
        onClose={() => setBreakdownType(null)}
        type={breakdownType}
        data={breakdownType && breakdownType !== 'DEBT' ? summary[breakdownType as 'INCOME' | 'EXPENSE' | 'DONATION'].breakdown : []}
        total={breakdownType && breakdownType !== 'DEBT' ? summary[breakdownType as 'INCOME' | 'EXPENSE' | 'DONATION'].total : 0}
      />
    </div>
  );
}

export default App;