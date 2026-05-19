// Configuration file for external links
// Update these links after token launch

export const EXTERNAL_LINKS = {
  // DexLab DEX Pool Link - LIVE
  raydium: 'https://app.dexlab.space/token-hub/CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx?tab=trade',
  
  // Jupiter Aggregator (alternative)
  jupiter: 'https://jup.ag/swap/SOL-CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx',
  
  // Solscan Explorer (for token info)
  solscan: 'https://solscan.io/token/CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx',
  
  // Social Media (add your actual links)
  twitter: 'https://twitter.com/FuturoXAI',
  discord: 'https://discord.gg/FuturoXAI',
  telegram: 'https://t.me/FuturoXAI',
  
  // Documentation
  whitepaper: '#', // Add link to whitepaper PDF
  roadmap: '#',    // Add link to roadmap
};

// Token Configuration
export const TOKEN_CONFIG = {
  symbol: 'FTRX',
  name: 'FuturoX AI',
  decimals: 9,
  // Token address on Solana
  address: 'CLNBpgy9dkAEZawHo4hpANeFBdkJfagT7o6byDwGFtrx',
  
  // Price API Configuration (for LivePriceChart)
  priceAPI: {
    // GeckoTerminal (no API key needed)
    gecko: 'https://api.geckoterminal.com/api/v2/networks/solana/pools/HvaXgLZP28ATMMmqNAyL2MM3ob3HC7XyCJZcrqH7dkyC',
    
    // Custom backend endpoint
    custom: '/api/ftrx/price',
  }
};
