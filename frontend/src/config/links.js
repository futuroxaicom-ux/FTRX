// Configuration file for external links
// Update these links after token launch

export const EXTERNAL_LINKS = {
  // Raydium DEX Pool Link
  // Replace 'FTRX_TOKEN_ADDRESS' with actual token address after launch
  raydium: 'https://raydium.io/swap/?inputCurrency=sol&outputCurrency=FTRX_TOKEN_ADDRESS',
  
  // Jupiter Aggregator (alternative)
  jupiter: 'https://jup.ag/swap/SOL-FTRX_TOKEN_ADDRESS',
  
  // Solscan Explorer (for token info)
  solscan: 'https://solscan.io/token/FTRX_TOKEN_ADDRESS',
  
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
  // Add token address after deployment
  address: 'FTRX_TOKEN_ADDRESS_PLACEHOLDER',
  
  // Price API Configuration (for LivePriceChart)
  // After token launch, you can use Jupiter Price API or your own backend
  priceAPI: {
    // Option 1: Jupiter Price API (recommended)
    jupiter: 'https://price.jup.ag/v4/price?ids=FTRX_TOKEN_ADDRESS',
    
    // Option 2: Your custom backend endpoint
    custom: '/api/token/price',
    
    // Option 3: CoinGecko (if token gets listed)
    coingecko: 'https://api.coingecko.com/api/v3/simple/price?ids=futurox-ai&vs_currencies=usd',
  }
};
