import React from 'react';

export const SectionHeader = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b-2 border-slate-100">
    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm">
      <Icon size={20} className="sm:hidden" />
      <Icon size={24} className="hidden sm:block" />
    </div>
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h2>
      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Complete this section for better results</p>
    </div>
  </div>
);
