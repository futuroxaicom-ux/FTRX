# 📊 How to Enable FTRX Price Chart After Token Launch

## Current Status
✅ **SOL Price Chart** - Working (live data from CoinGecko)  
🔒 **FTRX Price Chart** - Locked until token deployment

## Steps to Enable FTRX Price Display

### 1. Deploy Your Token
First, deploy FuturoX AI (FTRX) token on Solana mainnet and note the address.

### 2. Update Token Configuration

Open `/app/frontend/src/config/links.js`:

```javascript
export const TOKEN_CONFIG = {
  symbol: 'FTRX',
  name: 'FuturoX AI',
  decimals: 9,
  // Replace with your actual token address
  address: 'YourActualFTRXTokenAddress123456789',
  
  priceAPI: {
    // Jupiter Price API (recommended - instant availability)
    jupiter: 'https://price.jup.ag/v4/price?ids=YourActualFTRXTokenAddress123456789',
    
    // Or use your custom backend
    custom: '/api/token/price',
    
    // Or CoinGecko (after listing)
    coingecko: 'https://api.coingecko.com/api/v3/simple/price?ids=futurox-ai&vs_currencies=usd',
  }
};
```

### 3. Choose Price Data Source

#### Option A: Jupiter Price API (Recommended ⭐)
**Pros:** Instant availability, no API key needed, aggregated from multiple DEXs  
**Setup:** Just update the token address in config file

```javascript
// In LivePriceChart.jsx, add function:
const fetchFTRXPrice = async () => {
  try {
    const response = await fetch(
      `https://price.jup.ag/v4/price?ids=${TOKEN_CONFIG.address}`
    );
    const data = await response.json();
    if (data.data && data.data[TOKEN_CONFIG.address]) {
      setFtrxPrice(data.data[TOKEN_CONFIG.address].price);
    }
  } catch (error) {
    console.error('Failed to fetch FTRX price:', error);
  }
};
```

#### Option B: CoinGecko API
**Pros:** Historical data, volume, market cap  
**Cons:** Requires token listing on CoinGecko (takes time)

```javascript
const fetchFTRXPrice = async () => {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=futurox-ai&vs_currencies=usd&include_24hr_change=true'
  );
  const data = await response.json();
  setFtrxPrice(data['futurox-ai'].usd);
};
```

#### Option C: Your Custom Backend
**Pros:** Full control, can add custom metrics  
**Setup:** Create endpoint in your backend

Backend example (FastAPI):
```python
@app.get("/api/token/price")
async def get_token_price():
    # Fetch from Raydium pool or Jupiter
    price = await fetch_ftrx_price_from_dex()
    return {"price": price, "change_24h": change}
```

### 4. Update LivePriceChart Component

In `/app/frontend/src/components/LivePriceChart.jsx`:

**Find this section (around line 44):**
```javascript
const fetchFTRXPrice = async () => {
  // TODO: Implement after token is deployed
  // Check if token address is configured
  if (!TOKEN_CONFIG.address.includes('PLACEHOLDER')) {
    // ADD YOUR IMPLEMENTATION HERE
    
    // Example using Jupiter:
    try {
      const response = await fetch(
        `https://price.jup.ag/v4/price?ids=${TOKEN_CONFIG.address}`
      );
      const data = await response.json();
      if (data.data && data.data[TOKEN_CONFIG.address]) {
        setFtrxPrice(data.data[TOKEN_CONFIG.address].price);
      }
    } catch (error) {
      console.error('Failed to fetch FTRX price:', error);
    }
  }
};
```

### 5. Test the Integration

1. Save all changes
2. Hot reload will apply changes automatically
3. Click "FTRX" tab in the price chart
4. You should see live price instead of "Coming Soon" message

### 6. Add Historical Chart Data (Optional)

To show 7-day chart for FTRX like SOL:

```javascript
const fetchFTRXHistory = async () => {
  try {
    // Option 1: Use Birdeye API (Solana DEX data)
    const response = await fetch(
      `https://public-api.birdeye.so/public/history_price?address=${TOKEN_CONFIG.address}&address_type=token&type=1D&time_from=${sevenDaysAgo}&time_to=${now}`
    );
    
    // Option 2: Use your own backend that stores historical data
    // const response = await fetch('/api/token/history');
    
    const data = await response.json();
    // Format and set chart data
  } catch (error) {
    console.error('Failed to fetch FTRX history:', error);
  }
};
```

## Quick Checklist

After token deployment:

- [ ] Token deployed on Solana mainnet
- [ ] Token address updated in `config/links.js`
- [ ] Price API implementation added to `LivePriceChart.jsx`
- [ ] Test FTRX tab shows live price
- [ ] Price updates every 60 seconds
- [ ] Chart displays correctly
- [ ] 24h change percentage shows (if available)

## Troubleshooting

### FTRX tab still shows "Coming Soon"
- Check if `TOKEN_CONFIG.address` doesn't contain 'PLACEHOLDER'
- Verify token address is correct
- Check browser console for API errors

### Price shows as undefined or null
- Verify API endpoint returns data
- Check token has trading volume on DEX
- Ensure price data format matches your parsing logic

### Chart not displaying
- Implement `fetchFTRXHistory()` function
- Verify historical data API is available
- Check data format matches chart requirements

## Recommended: Jupiter Price API

Jupiter is the best option because:
- ✅ Works immediately after first trade
- ✅ Aggregates from all Solana DEXs
- ✅ No API key required
- ✅ Real-time updates
- ✅ Reliable and fast

**Example Response:**
```json
{
  "data": {
    "YourTokenAddress": {
      "id": "YourTokenAddress",
      "type": "derivedPrice",
      "price": "0.0042"
    }
  }
}
```

## Support

If you need help:
- Jupiter API Docs: https://station.jup.ag/docs/apis/price-api
- Birdeye API: https://docs.birdeye.so/
- CoinGecko API: https://www.coingecko.com/en/api

---

**Files to Update:**
1. `/app/frontend/src/config/links.js` - Token address
2. `/app/frontend/src/components/LivePriceChart.jsx` - Price fetching logic
