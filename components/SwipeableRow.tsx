import React, { useState, useRef } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
  className?: string;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({ children, onDelete, onEdit, className = '' }) => {
  const [offsetX, setOffsetX] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const threshold = 80;

  // Helper to clamp values
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Clamp the swipe distance for resistance feel (max 150px)
    // We clamp it instead of returning to keep the UI responsive
    const clampedDiff = clamp(diff, -150, 150);
    setOffsetX(clampedDiff);
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    finishSwipe();
  };

  // --- Mouse Handlers (Desktop Support) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    startX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || startX.current === null) return;
    e.preventDefault(); // Prevent text selection
    const currentX = e.clientX;
    const diff = currentX - startX.current;

    const clampedDiff = clamp(diff, -150, 150);
    setOffsetX(clampedDiff);
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    finishSwipe();
  };

  const handleMouseLeave = () => {
    // If dragging and leaves the container, treat as release/cancel
    if (isDragging.current) {
      finishSwipe();
    }
  };

  // --- Logic ---
  const finishSwipe = () => {
    // Use the current state 'offsetX' to decide action
    const absOffset = Math.abs(offsetX);
    
    if (absOffset > threshold) {
      if (offsetX > 0) {
        // Right Swipe -> Edit
        onEdit();
      } else {
        // Left Swipe -> Delete
        onDelete();
      }
    }
    
    // Reset visual state
    setOffsetX(0);
    startX.current = null;
    isDragging.current = false;
  };

  const getBackgroundStyle = () => {
    if (offsetX > 0) return 'bg-blue-500 justify-start'; 
    if (offsetX < 0) return 'bg-rose-500 justify-end';   
    return 'bg-transparent';
  };

  return (
    <div className={`relative overflow-hidden mb-3 rounded-xl select-none touch-pan-y ${className}`}>
      {/* Background Actions */}
      <div 
        className={`absolute inset-0 flex items-center px-6 text-white transition-colors duration-200 ${getBackgroundStyle()}`}
      >
        {offsetX > 0 && <Edit2 size={20} />}
        {offsetX < 0 && <Trash2 size={20} />}
      </div>

      {/* Foreground Content */}
      <div
        className="relative z-10 cursor-grab active:cursor-grabbing will-change-transform"
        style={{ 
          transform: `translateX(${offsetX}px)`, 
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </div>
  );
};