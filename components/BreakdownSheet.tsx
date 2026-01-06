import React from 'react';
import { TransactionType, CategorySummary } from '../types';
import { TYPE_CONFIG, CURRENCY_SYMBOL } from '../constants';
import { X } from 'lucide-react';

interface BreakdownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType | null;
  data: CategorySummary[];
  total: number;
}

export const BreakdownSheet: React.FC<BreakdownSheetProps> = ({ isOpen, onClose, type, data, total }) => {
  if (!isOpen || !type) return null;

  const config = TYPE_CONFIG[type];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl p-6 pointer-events-auto shadow-2xl animate-slide-up relative max-h-[70vh] overflow-y-auto transition-colors duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-full ${config.bgColor} dark:bg-opacity-20`}>
                {React.createElement(config.icon, { size: 20, className: config.color })}
             </div>
             <div>
                <h2 className={`text-xl font-bold ${config.color}`}>{config.label} Breakdown</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Total: {CURRENCY_SYMBOL}{total.toLocaleString()}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="space-y-4">
          {data.length === 0 ? (
             <p className="text-slate-400 dark:text-slate-600 text-center py-4">No data available.</p>
          ) : (
            data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                       <div className={`absolute bottom-0 left-0 w-full ${config.color.replace('text-', 'bg-')}`} style={{ height: `${item.percentage}%` }} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-700 dark:text-slate-200">{item.category}</p>
                       <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{Math.round(item.percentage)}%</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className={`font-bold ${config.color}`}>{CURRENCY_SYMBOL}{item.total.toLocaleString()}</p>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};