import { Loader2, Sparkles } from 'lucide-react';

export const MagicButton = ({
  onClick,
  loading,
  label,
  variant = 'enhance'
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  variant?: 'enhance' | 'translate';
}) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`group relative inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 min-h-10 text-sm sm:text-xs font-bold text-white transition-all duration-300 w-full sm:w-auto rounded-full shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden hover:scale-105 active:scale-95 ${
      variant === 'enhance'
        ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 hover:from-purple-600 hover:via-pink-600 hover:to-rose-600 hover:shadow-purple-500/20'
        : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 hover:from-blue-600 hover:via-indigo-600 hover:to-cyan-600 hover:shadow-blue-500/20'
    }`}
  >
    <span className="absolute inset-0 bg-white/20 rounded-full blur-xl group-hover:blur-2xl transition opacity-0 group-hover:opacity-50"></span>
    <span className="relative flex items-center gap-1 z-10">
      {loading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14} className="group-hover:rotate-12 group-hover:scale-110 transition"/>}
      {label}
    </span>
  </button>
);
