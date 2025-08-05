const tokens = [
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    name: "WETH",
    decimals: 18,
  },
  {
    address: "0x0000000000000000000000000000000000000000",
    name: "ETH",
    decimals: 18,
  },
  {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: "USDC",
    decimals: 6,
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    name: "USDT",
    decimals: 6,
  },
  {
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    name: "PEPE",
    decimals: 18,
  },
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: "WBTC",
    decimals: 8,
  },
  {
    address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
    name: "MATIC",
    decimals: 18,
  },
  {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    name: "DAI",
    decimals: 18,
  },
  {
    address: "0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85",
    name: "FETCH",
    decimals: 18,
  },
  {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    name: "UNI",
    decimals: 18,
  },
  {
    address: "0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3",
    name: "ONDO",
    decimals: 18,
  },
  {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    name: "LINK",
    decimals: 18,
  },
  {
    address: "0xE0f63A424a4439cBE457D80E4f4b51aD25b2c56C",
    name: "SPX",
    decimals: 8,
  },
  {
    address: "0xaaeE1A9723aaDB7afA2810263653A34bA2C21C7a",
    name: "MOG",
    decimals: 18,
  },
  {
    address: "0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3",
    name: "ELON",
    decimals: 18,
  },
  {
    address: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1",
    name: "ARB",
    decimals: 18,
  },
  {
    address: "0x57e114B691Db790C35207b2e685D4A43181e6061",
    name: "ENA",
    decimals: 18,
  },
  {
    address: "0x9D65fF81a3c488d585bBfb0Bfe3c7707c7917f54",
    name: "SSV",
    decimals: 18,
  },
  {
    address: "0x0B010000b7624eb9B3DfBC279673C76E9D29D5F7",
    name: "OBOL",
    decimals: 18,
  },
  {
    address: "0x88909D489678dD17aA6D9609F89B0419Bf78FD9a",
    name: "L3",
    decimals: 18,
  },
  {
    address: "0xbe0Ed4138121EcFC5c0E56B40517da27E6c5226B",
    name: "ATH",
    decimals: 18,
  },
  {
    address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    name: "CRV",
    decimals: 18,
  },
  {
    address: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
    name: "MANA",
    decimals: 18,
  },
  {
    address: "0x7420B4b9a0110cdC71fB720908340C03F9Bc03EC",
    name: "JASMY",
    decimals: 18,
  },
  {
    address: "0x643C4E15d7d62Ad0aBeC4a9BD4b001aA3Ef52d66",
    name: "SYRUP",
    decimals: 18,
  },
  
  
];

export const getTokenName = (tokenAddress: string) => {
  return tokens.find((token) => token.address === tokenAddress)?.name || tokenAddress;
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

