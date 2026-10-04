/** Inline spinner for buttons and content areas */
export default function Spinner({ size = 'md', className = '' }) {
  const namedSizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };
  const isNamed = typeof size === 'string' && namedSizes[size];
  const sizeClass = isNamed ? namedSizes[size] : '';
  const inlineStyle = !isNamed && typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div
      role="status"
      aria-label="Loading"
      style={inlineStyle}
      className={`shrink-0 rounded-full border-2 border-surface-border border-t-brand-400 animate-spin ${sizeClass} ${className}`}
    />
  );
}
