/**
 * Token translation utilities for price API compatibility
 * Currently only handles WETH -> ETH conversion
 */

// WETH contract address
const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

/**
 * Translates token addresses for price API compatibility
 * Currently only handles WETH -> ETH conversion
 */
export function translateTokenAddress(address: string): string {
  const normalizedAddress = address.toLowerCase();
  
  // Convert WETH to ETH for price API compatibility
  if (normalizedAddress === WETH_ADDRESS) {
    return 'ETH';
  }
  
  // Return original address for all other tokens
  return address;
}

/**
 * Translates token name for price API compatibility
 * Currently only handles WETH -> ETH conversion
 */
export function translateTokenName(tokenName: string): string {
  const normalizedName = tokenName.toUpperCase();
  
  // Convert WETH to ETH for price API compatibility
  if (normalizedName === 'WETH') {
    return 'ETH';
  }
  
  // Return original name for all other tokens
  return tokenName;
}

/**
 * Checks if a token address is WETH
 */
export function isWETH(address: string): boolean {
  return address.toLowerCase() === WETH_ADDRESS;
}

/**
 * Gets the display name for a token (for logging/debugging)
 */
export function getTokenDisplayName(address: string, originalName?: string): string {
  if (isWETH(address)) {
    return 'ETH (from WETH)';
  }
  return originalName || address;
} 