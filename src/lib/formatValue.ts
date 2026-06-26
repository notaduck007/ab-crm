/**
 * Shared bid-value formatter.
 *
 * Variants:
 *   - 'compact'  → "$1.5K" / "$4.5M" / "TBD" — for cards
 *   - 'full'     → "$1,234,567" / "Value TBD" — for the detail panel
 */
export type FormatValueVariant = 'compact' | 'full';

export function formatBidValue(
  v: number | null | undefined,
  variant: FormatValueVariant = 'compact'
): string {
  if (v == null) {
    return variant === 'full' ? 'Value TBD' : 'TBD';
  }
  if (variant === 'full') {
    return `$${v.toLocaleString()}`;
  }
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}
