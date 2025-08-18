import { tokens } from './assets/tokens';

/**
 * Get token name from address
 */
export function getTokenName(address: string): string {
  const normalizedAddress = address.toLowerCase();
  const token = tokens.find(t => t.address.toLowerCase() === normalizedAddress);
  return token ? token.name : address;
}

/**
 * Get token decimals from address
 */
export function getTokenDecimals(address: string): number {
  const normalizedAddress = address.toLowerCase();
  const token = tokens.find(t => t.address.toLowerCase() === normalizedAddress);
  return token ? token.decimals : 18; // Default to 18 decimals
}

/**
 * Format volume with appropriate units
 */
export function formatVolume(volume: number): { display: string; full: string } {
  if (volume === 0) {
    return { display: '0', full: '0' };
  }

  const units = ['', 'K', 'M', 'B', 'T'];
  const unitIndex = Math.floor(Math.log10(volume) / 3);
  const unit = units[unitIndex] || '';
  const scaledVolume = volume / Math.pow(1000, unitIndex);

  const display = `${scaledVolume.toFixed(2)}${unit}`;
  const full = volume.toLocaleString();

  return { display, full };
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
