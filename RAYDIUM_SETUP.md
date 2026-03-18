# 🔗 How to Update Raydium Link After Token Launch

## Steps to Configure Raydium Integration

### 1. Deploy Your Token on Solana
First, deploy your FuturoX AI (FTRX) token on Solana mainnet and note the **token address**.

### 2. Create Raydium Pool
- Go to https://raydium.io/liquidity/create/
- Create a liquidity pool for FTRX/SOL pair
- Note the pool address

### 3. Update Configuration File

Open `/app/frontend/src/config/links.js` and replace placeholders:

```javascript
export const EXTERNAL_LINKS = {
  // Replace with your actual Raydium pool link
  raydium: 'https://raydium.io/swap/?inputCurrency=sol&outputCurrency=YOUR_FTRX_TOKEN_ADDRESS',
  
  // Alternative: Jupiter Aggregator
  jupiter: 'https://jup.ag/swap/SOL-YOUR_FTRX_TOKEN_ADDRESS',
  
  // Token explorer
  solscan: 'https://solscan.io/token/YOUR_FTRX_TOKEN_ADDRESS',
};

export const TOKEN_CONFIG = {
  symbol: 'FTRX',
  name: 'FuturoX AI',
  decimals: 9,
  address: 'YOUR_FTRX_TOKEN_ADDRESS', // Add your token address here
};
```

### 4. Example with Real Address

If your token address is: `FTRXa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9`

Update to:
```javascript
raydium: 'https://raydium.io/swap/?inputCurrency=sol&outputCurrency=FTRXa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9',
```

### 5. Test the Link
After updating:
1. Save the file
2. The app will hot-reload automatically
3. Click "Buy on Raydium" button
4. It should now open Raydium with your token pre-selected

## Additional Configuration

### Update Social Media Links
In the same `links.js` file, update:
```javascript
twitter: 'https://twitter.com/YourActualHandle',
discord: 'https://discord.gg/YourInviteCode',
telegram: 'https://t.me/YourChannel',
```

### Update Footer Links
The footer automatically uses these links from the config file.

## Important Notes

⚠️ **Before Launch:**
- The "Buy on Raydium" button will show: "Link will be available after token launch"
- Clicking it displays an alert message

✅ **After Configuration:**
- Button opens Raydium swap page with FTRX pre-selected
- Users can trade directly on the DEX

## Testing Checklist

- [ ] Token deployed on Solana mainnet
- [ ] Raydium pool created with liquidity
- [ ] Token address updated in `config/links.js`
- [ ] Raydium link tested in browser
- [ ] "Buy on Raydium" button opens correct page
- [ ] Token appears in swap interface

## Support

If you need help:
1. Check Raydium documentation: https://docs.raydium.io/
2. Verify token address on Solscan
3. Test link in incognito mode

---

**File Location:** `/app/frontend/src/config/links.js`
