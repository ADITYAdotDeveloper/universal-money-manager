import React, { useState } from 'react';
import { TransactionType, CategorySummary } from '../types';
import { TYPE_CONFIG, CURRENCY_SYMBOL } from '../constants';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CountUp } from './CountUp';

interface SummaryGroupProps {
  type: TransactionType;
  total: number;
  categories: CategorySummary[];
}

export const SummaryGroup: React.FC<SummaryGroupProps> = ({ type, total, categories }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden mb-3 transition-all duration-300">
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-800`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.bgColor} dark:bg-opacity-10`}>
            <Icon size={20} className={config.color} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{config.label}</h3>
            <div className={`text-xl font-bold ${config.color}`}>
              <CountUp end={total} prefix={CURRENCY_SYMBOL} />
            </div>
          </div>
        </div>
        <div className="text-slate-400 dark:text-slate-600">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Expanded Details */}
      <div 
        className={`transition-[max-height] duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-96' : 'max-h-0'}`}
      >
        <div className="p-4 pt-0 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">No entries yet.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">{cat.category}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {CURRENCY_SYMBOL}{cat.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${config.color.replace('text-', 'bg-')}`} 
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};