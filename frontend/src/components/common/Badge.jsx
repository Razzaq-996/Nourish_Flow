/**
 * Badge component — wraps the .badge-* CSS utility classes.
 * Accepts a `variant` prop that maps to one of the predefined badge styles.
 * Includes a subtle status dot for enhanced visual hierarchy.
 */
export default function Badge({ children, variant = 'slate', className = '', showDot = true }) {
  const badgeClass = variant.startsWith('badge-') ? variant : `badge-${variant}`;
  return (
    <span className={`badge ${badgeClass} tracking-wide font-medium ${className}`}>
      {showDot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75 shrink-0" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}

