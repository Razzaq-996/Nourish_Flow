import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * IdChip — enterprise-grade copyable ID pill.
 * Shows truncated ID with one-click copy and instant visual feedback.
 */
export default function IdChip({ id, prefix = '', className = '' }) {
  const [copied, setCopied] = useState(false);

  if (!id) return null;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const strId = String(id);
  const displayId = strId.length > 8 ? `...${strId.slice(-6)}` : strId;

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Click to copy ID: ${strId}`}
      aria-label={`Copy ID ${strId}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium transition-all duration-150 border select-none group ${
        copied
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
          : 'bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/90 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
      } ${className}`}
    >
      <span>
        {prefix && <span className="opacity-70">{prefix}: </span>}
        {displayId}
      </span>
      {copied ? (
        <Check size={11} className="text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
      ) : (
        <Copy size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
