import React from 'react';
import { ArrowDown, Check, TrendingDown } from 'lucide-react';
import { CURRENCY_SYMBOL } from '../constants';
import { CountUp } from './CountUp';

interface DebtVisualizerProps {
  totalDebt: number; // Accumulated debt (initial 100%)
  paidDebt: number;  // Amount paid off
  onReduceDebt: () => void;
}

export const DebtVisualizer: React.FC<DebtVisualizerProps> = ({ totalDebt, paidDebt, onReduceDebt }) => {
  const remainingDebt = Math.max(0, totalDebt - paidDebt);
  const ratio = totalDebt > 0 ? remainingDebt / totalDebt : 0;
  
  // Visual parameters
  const ballRadius = remainingDebt === 0 ? 0 : 15 + (25 * ratio);
  const slack = (1 - ratio) * 60; 

  return (
    <div className="bg-slate-100/80 dark:bg-slate-800/50 rounded-[2rem] p-6 relative overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner transition-colors duration-300">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">Burden</h3>
          <div className="text-slate-800 dark:text-white font-bold text-2xl mt-1">
             <CountUp end={remainingDebt} prefix={CURRENCY_SYMBOL} />
             {totalDebt > 0 && remainingDebt === 0 && <span className="text-xs text-emerald-500 ml-2 font-bold uppercase">Free!</span>}
          </div>
        </div>
        <button 
          onClick={onReduceDebt}
          className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-xl active:scale-95 transition-transform hover:bg-slate-700 dark:hover:bg-slate-600 shadow-lg flex items-center gap-2"
          aria-label="Reduce Debt"
        >
          <span className="text-xs font-bold">Pay</span>
          <TrendingDown size={16} />
        </button>
      </div>

      <div className="h-44 w-full relative flex items-center justify-center">
        <svg viewBox="0 0 200 160" className="w-full h-full drop-shadow-sm">
          {/* Floor Shadow */}
          <ellipse cx="100" cy="120" rx="90" ry="6" fill="#cbd5e1" className="dark:fill-slate-700" opacity="0.6" />

          {/* Stickman */}
          <g stroke="#334155" className="dark:stroke-slate-400" strokeWidth="3" strokeLinecap="round" fill="none">
             {/* Head */}
             <circle cx="50" cy="50" r="8" />
             {/* Body */}
             <path d="M50 58 L50 90" />
             {/* Arms */}
             <path d="M50 65 L30 80" /> {/* Left Arm */}
             <path d="M50 65 L70 80" /> {/* Right Arm */}
             {/* Legs */}
             <path d="M50 90 L35 120" /> {/* Left Leg */}
             <path d="M50 90 L65 120" /> {/* Right Leg (Tied) */}
          </g>

          {/* Chain */}
          {remainingDebt > 0 && (
             <path 
               d={`M65 120 Q ${100} ${120 + slack} ${140} 120`} 
               stroke="#475569"
               strokeWidth="2" 
               strokeDasharray="3 2"
               fill="none"
               className="transition-all duration-700 ease-out dark:stroke-slate-500"
             />
          )}

          {/* Iron Ball */}
          {remainingDebt > 0 && (
            <g 
              className="transition-all duration-700 ease-out origin-[140px_120px]"
              style={{ transformBox: 'fill-box' }}
            >
              <circle cx="140" cy="120" r={ballRadius} fill="#1e293b" className="dark:fill-black" />
              {/* Metallic Shine */}
              <circle cx={140 - ballRadius/3} cy={120 - ballRadius/3} r={ballRadius/4} fill="white" opacity="0.15" />
              {/* Text on ball */}
              {ballRadius > 15 && (
                <text x="140" y="120" textAnchor="middle" dy=".3em" fill="white" fontSize={ballRadius * 0.4} opacity="0.9" fontWeight="bold">
                  {Math.round(ratio * 100)}%
                </text>
              )}
            </g>
          )}
        </svg>
      </div>

      <div className="mt-1 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
         {totalDebt > 0 ? (
           <>
            <span>Borrowed: {CURRENCY_SYMBOL}{totalDebt.toLocaleString()}</span>
           </>
         ) : (
            <span>No active debt</span>
         )}
      </div>
    </div>
  );
};