import React from 'react';

interface PriorityBadgeProps {
  priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const getStyles = () => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 font-semibold border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span className={`inline-flex items-center rounded border ${getStyles()} ${sizeClass}`}>
      {priority}
    </span>
  );
};
