import React, { useRef } from 'react';
import { TransactionType } from '../types';

interface OrganicChartProps {
  income: number;
  expense: number;
  donation: number;
  onSectionClick: (type: TransactionType) => void;
}

export const OrganicChart: React.FC<OrganicChartProps> = ({ income, expense, donation, onSectionClick }) => {
  const total = income + expense + donation || 1;
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate percentages
  const incPct = (income / total);
  const expPct = (expense / total);
  const donPct = (donation / total);

  // Calculate angles (degrees)
  const incDeg = incPct * 360;
  const expDeg = expPct * 360;
  // Donation fills the rest

  // Gradient stops
  // Income (Green) -> Expense (Red) -> Donation (Purple)
  // Using conic-gradient with blur filter for organic blend
  const gradient = `conic-gradient(
    from 0deg,
    #10b981 0deg ${incDeg}deg,
    #e11d48 ${incDeg}deg ${incDeg + expDeg}deg,
    #9333ea ${incDeg + expDeg}deg 360deg
  )`;

  // Click Handler to detect segment
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Calculate angle in degrees (0 at top, clockwise)
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle = (angle + 90);
    if (angle < 0) angle += 360;

    // Determine section
    if (angle <= incDeg) {
      if (income > 0) onSectionClick('INCOME');
    } else if (angle <= incDeg + expDeg) {
      if (expense > 0) onSectionClick('EXPENSE');
    } else {
      if (donation > 0) onSectionClick('DONATION');
    }
  };

  // Helper to position labels
  const getLabelPosition = (startAngle: number, sweepAngle: number, radius: number = 35) => {
    const midAngle = startAngle + sweepAngle / 2;
    // Convert to radians. Adjust for 0 being top (subtract 90 deg)
    const rad = (midAngle - 90) * (Math.PI / 180);
    const x = 50 + radius * Math.cos(rad);
    const y = 50 + radius * Math.sin(rad);
    return { x: `${x}%`, y: `${y}%` };
  };

  const incPos = getLabelPosition(0, incDeg);
  const expPos = getLabelPosition(incDeg, expDeg);
  const donPos = getLabelPosition(incDeg + expDeg, 360 - (incDeg + expDeg));

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div 
        ref={containerRef}
        className="relative w-72 h-72 cursor-pointer tap-highlight-transparent group"
        onClick={handleClick}
      >
        {/* Organic Blob Shape with Morphing */}
        <div className="absolute inset-0 animate-morph overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-black/50 transition-all duration-300 active:scale-95 bg-slate-100 dark:bg-slate-800">
          {/* The Gradient Chart with Heavy Blur for full blending */}
          {/* Increased blur-2xl and inset scaling to prevent edge fade-out */}
          <div 
            className="absolute inset-[-15%] blur-2xl opacity-90 dark:opacity-80 transition-transform duration-700"
            style={{ background: gradient }}
          />
          
          {/* Subtle noise/texture overlay for liveliness */}
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] mix-blend-overlay" />
        </div>

        {/* Labels - Absolutely positioned based on angle */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {income > 0 && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ left: incPos.x, top: incPos.y }}
            >
              <span className="text-white font-black text-xl drop-shadow-md">{Math.round(incPct * 100)}%</span>
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider drop-shadow-sm">Inc</span>
            </div>
          )}
          
          {expense > 0 && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ left: expPos.x, top: expPos.y }}
            >
              <span className="text-white font-black text-xl drop-shadow-md">{Math.round(expPct * 100)}%</span>
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider drop-shadow-sm">Exp</span>
            </div>
          )}

          {donation > 0 && (
            <div 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-300 group-hover:scale-110"
              style={{ left: donPos.x, top: donPos.y }}
            >
              <span className="text-white font-black text-xl drop-shadow-md">{Math.round(donPct * 100)}%</span>
              <span className="text-white/90 text-[10px] font-bold uppercase tracking-wider drop-shadow-sm">Don</span>
            </div>
          )}
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500 font-medium italic animate-pulse">
        Tap a color section to see breakdown
      </p>
    </div>
  );
};