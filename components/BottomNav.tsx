import React from 'react';
import { Home, Calendar, Layers } from 'lucide-react';
import { ViewMode } from '../types';

interface BottomNavProps {
  currentView: ViewMode;
  onChange: (view: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
  const navItems: { id: ViewMode; icon: React.ElementType; label: string }[] = [
    { id: 'HOME', icon: Home, label: 'Home' },
    { id: 'MONTH', icon: Calendar, label: 'This Month' },
    { id: 'YEAR', icon: Layers, label: 'This Year' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-6 py-2 pb-6 z-40 flex justify-between items-center shadow-[0_-4px_30px_rgba(0,0,0,0.03)] transition-colors duration-300">
      {navItems.map((item) => {
        const isActive = currentView === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`flex flex-col items-center gap-1 min-w-[64px] transition-all duration-300 ${
              isActive ? 'text-slate-900 dark:text-white -translate-y-1' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-slate-100 dark:bg-slate-800' : 'bg-transparent'}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};