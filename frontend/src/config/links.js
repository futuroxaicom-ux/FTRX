// Configuration file for external links
// Update these links after token launch

export const EXTERNAL_LINKS = {
  // Raydium DEX Pool Link - LIVE
  raydium: 'https://raydium.io/swap/?inputMint=sol&outputMint=9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray',
  
  // Jupiter Aggregator (alternative)
  jupiter: 'https://jup.ag/swap/SOL-9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray',
  
  // Solscan Explorer (for token info)
  solscan: 'https://solscan.io/token/9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray',
  
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
  address: '9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray',
  
  // Price API Configuration (for LivePriceChart)
  priceAPI: {
    // Option 1: Jupiter Price API (recommended)
    jupiter: 'https://price.jup.ag/v4/price?ids=9BJSWWexWrGffYR4RJBL8YtdwoNGPLgA1yDvZ4zBxray',
    
    // Option 2: Your custom backend endpoint
    custom: '/api/token/price',
    
    // Option 3: CoinGecko (if token gets listed)
    coingecko: 'https://api.coingecko.com/api/v3/simple/price?ids=futurox-ai&vs_currencies=usd',
  }
};
