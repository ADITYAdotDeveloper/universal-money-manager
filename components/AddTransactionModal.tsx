import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, CategoryMap, DebtSubtype } from '../types';
import { TYPE_CONFIG } from '../constants';
import { X, Check, Plus, Minus, ArrowDown, ArrowUp } from 'lucide-react';
import { StorageService } from '../services/storageService';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (t: Transaction) => void;
  existingTransaction?: Transaction | null;
  categories: CategoryMap;
  setCategories: (c: CategoryMap) => void;
  defaultType?: TransactionType;
  isRepaymentMode?: boolean;
}

// Robust ID generator fallback for non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID fails
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingTransaction,
  categories,
  setCategories,
  defaultType = 'EXPENSE',
  isRepaymentMode = false
}) => {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [debtSubtype, setDebtSubtype] = useState<DebtSubtype>('GOOD');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Local toggle for Debt mode: 'BORROW' or 'REPAY'
  const [debtAction, setDebtAction] = useState<'BORROW' | 'REPAY'>('BORROW');

  // Reset or Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingTransaction) {
        setType(existingTransaction.type);
        setAmount(Math.abs(existingTransaction.amount).toString());
        setCategory(existingTransaction.category);
        setDate(existingTransaction.date.split('T')[0]);
        if (existingTransaction.debtSubtype) {
            setDebtSubtype(existingTransaction.debtSubtype);
        }
        
        // Determine Debt Action based on existing data
        if (existingTransaction.type === 'DEBT') {
           if (existingTransaction.isRepayment || existingTransaction.amount < 0) {
               setDebtAction('REPAY');
           } else {
               setDebtAction('BORROW');
           }
        }
      } else {
        setAmount('');
        // If passed explicit repayment mode (e.g. from Visualizer button), set DEBT and REPAY
        if (isRepaymentMode) {
          setType('DEBT');
          setDebtAction('REPAY');
        } else {
          setType(defaultType);
          setDebtAction('BORROW');
        }
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        
        // Default categories
        if (!category && !isRepaymentMode && categories[defaultType]?.length > 0) {
            setCategory(categories[defaultType][0]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingTransaction, isRepaymentMode, defaultType]);

  // Update default category when type changes if not editing
  useEffect(() => {
    if (!existingTransaction && !isRepaymentMode && categories[type]?.length > 0) {
        setCategory(categories[type][0]);
    }
  }, [type, categories, existingTransaction, isRepaymentMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    const isRepay = type === 'DEBT' && debtAction === 'REPAY';
    
    // Category Logic
    let finalCategory = category;
    if (isRepay) {
      finalCategory = 'Repayment';
    } else if (type === 'DEBT') {
       finalCategory = debtSubtype ? `${debtSubtype.charAt(0) + debtSubtype.slice(1).toLowerCase()} Debt` : 'Debt';
    } else if (!finalCategory) {
       finalCategory = 'General';
    }
    
    let finalAmount = parseFloat(amount);
    
    // Sign Logic
    if (isRepay) {
      finalAmount = -Math.abs(finalAmount);
    } else {
      finalAmount = Math.abs(finalAmount);
    }

    const payload: Transaction = {
      id: existingTransaction ? existingTransaction.id : generateId(),
      date: new Date(date).toISOString(),
      amount: finalAmount,
      type: type,
      category: finalCategory,
      debtSubtype: type === 'DEBT' && !isRepay ? debtSubtype : undefined,
      isRepayment: isRepay
    };
    onSave(payload);
    onClose();
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsProcessing(true);
    try {
      const updated = await StorageService.addCategory(type, newCategoryName.trim());
      setCategories(updated);
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (e) {
      alert("Failed to save category. Check connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid = !!amount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 pointer-events-auto shadow-2xl animate-slide-up sm:animate-fade-in relative max-h-[90vh] overflow-y-auto transition-colors duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {existingTransaction ? 'Edit Entry' : 'New Entry'}
          </h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TYPE_CONFIG) as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  type === t 
                    ? `${TYPE_CONFIG[t].bgColor} ${TYPE_CONFIG[t].color} ring-2 ring-inset ring-current dark:bg-opacity-20` 
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">{TYPE_CONFIG[t].label}</span>
              </button>
            ))}
          </div>

          {/* Special Toggle for DEBT: Borrow vs Repay */}
          {type === 'DEBT' && (
             <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                   type="button"
                   onClick={() => setDebtAction('BORROW')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                      debtAction === 'BORROW' 
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' 
                      : 'text-slate-500 dark:text-slate-400'
                   }`}
                >
                   <ArrowDown size={16} className={debtAction === 'BORROW' ? 'text-rose-500' : ''} />
                   Borrow
                </button>
                <button
                   type="button"
                   onClick={() => setDebtAction('REPAY')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                      debtAction === 'REPAY' 
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' 
                      : 'text-slate-500 dark:text-slate-400'
                   }`}
                >
                   <ArrowUp size={16} className={debtAction === 'REPAY' ? 'text-emerald-500' : ''} />
                   Repay
                </button>
             </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
               {type === 'DEBT' && debtAction === 'REPAY' ? 'Payment Amount' : 'Amount'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl py-4 pl-10 pr-4 text-3xl font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="0"
                autoFocus={!existingTransaction}
              />
            </div>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Category Section */}
          {/* Hide Category if Repaying (Standard Repayment) */}
          {(type !== 'DEBT' || debtAction === 'BORROW') && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Category</label>
              
              {type === 'DEBT' ? (
                <div className="grid grid-cols-2 gap-3">
                  {(['GOOD', 'BAD'] as DebtSubtype[]).map(subtype => (
                    <button
                      key={subtype}
                      type="button"
                      onClick={() => setDebtSubtype(subtype)}
                      className={`p-3 rounded-xl border font-medium transition-all ${
                        debtSubtype === subtype
                          ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-700'
                          : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {subtype} Debt
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {!isAddingCategory ? (
                    <div className="flex flex-wrap gap-2">
                      {categories[type]?.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategory(cat)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            category === cat
                              ? `${TYPE_CONFIG[type].bgColor} ${TYPE_CONFIG[type].color} ring-1 ring-inset ring-current dark:bg-opacity-20`
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="px-4 py-2 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1"
                      >
                        <Plus size={14} /> New
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Enter new category..."
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={isProcessing}
                        className={`p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl ${isProcessing ? 'opacity-50' : ''}`}
                      >
                         <Check size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full text-white text-lg font-bold py-4 rounded-2xl shadow-lg transition-all ${
              isFormValid 
                ? 'bg-slate-900 dark:bg-blue-600 shadow-slate-200 dark:shadow-slate-900 active:scale-[0.98]' 
                : 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed opacity-70'
            }`}
          >
            {type === 'DEBT' && debtAction === 'REPAY' ? 'Pay Debt' : (existingTransaction ? 'Update Entry' : 'Save Entry')}
          </button>
        </form>
      </div>
    </div>
  );
};