import { tokens } from "./tokens";

export const getTokenName = (tokenAddress: string) => {
  return tokens.find((token) => token.address.toLowerCase() === tokenAddress.toLowerCase())?.name || tokenAddress;
};

export const getTokenDecimals = (tokenAddress: string) => {
  return tokens.find((token) => token.address === tokenAddress)?.decimals || 18;
};

export const formatVolume = (value: number): { display: string; full: string } => {
  if (value === 0) return { display: '0', full: '0' };
  
  const absValue = Math.abs(value);
  let display: string;
  let full: string;
  
  if (absValue >= 1e9) {
    display = `${(value / 1e9).toFixed(2)}B`;
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else if (absValue >= 1e6) {
    display = `${(value / 1e6).toFixed(2)}M`;
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else if (absValue >= 1e3) {
    display = `${(value / 1e3).toFixed(2)}K`;
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else if (absValue >= 1) {
    display = value.toFixed(2);
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  } else {
    display = value.toFixed(6);
    full = value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  }
  
  return { display, full };
};

export const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (!address || address.length <= startLength + endLength + 3) {
    return address;
  }
  return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
};

