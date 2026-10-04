/**
 * Badge component — wraps the .badge-* CSS utility classes.
 * Accepts a `variant` prop that maps to one of the predefined badge styles.
 */
export default function Badge({ children, variant = 'slate', className = '' }) {
  const badgeClass = variant.startsWith('badge-') ? variant : `badge-${variant}`;
  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {children}
    </span>
  );
}
