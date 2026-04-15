# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot + Multi-Bot Platform + Bot Trading Offer.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter, Recharts, i18next
- **Backend**: FastAPI, MongoDB (Motor), httpx, solders, base58
- **APIs**: CoinGecko (SOL), DexScreener (FTRX/tokens), Jupiter V1 Swap API, Solana RPC, Helius RPC

## Completed Work
- [x] Landing page with i18n (EN/ES/PL), countdown, tokenomics, roadmap
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Volume Bot 1 (FTRX/SOL) with Organic Mode v2
- [x] Volume Bot 2 (MMAC)
- [x] Volume Bot 3 "Bot Makk GL" - Token Pair Mode (MAKK GL <-> CRBR via DexLab/Orca)
- [x] Multi-Bot Panel: Volume, Spread, Sniper, Trade, Arbitrage, Copy Trade, Holder
- [x] Sniper Bot: Helius WebSocket real-time token sniping with TP/SL and MongoDB history
- [x] Holder Bot: Token-Only mode + Classic SOL mode + Skip existing holders fix
- [x] Holder Bot presets: 100, 250, 500, 1000, 5000 holders
- [x] Analytics tracking dashboard
- [x] Direct SPL Token collection, distribution, withdrawal endpoints
- [x] Withdraw tokens to external address endpoint
- [x] Fix: RPC batch 403/429 for token balances → single calls with mainnet-beta + retry
- [x] Fix: Dynamic token labels (FTRX/MAKK GL/Token) per bot type
- [x] Fix: Holder Bot distribute skips existing holders (no duplicates)
- [x] Bot Trading Offer landing page section with WOW effect
- [x] 5 bot pricing cards (Spread $99, Sniper $199, Trade $199, Arbitrage $99, Copy Trade $99/$499)
- [x] Non-custodial messaging, dedicated panel info, exclusive bot offer via support@futuroxai.com

## Bot Trading Offer (Landing Page)
- Spread Bot: $99/month FTRX - ROI 15-30%
- Sniper Bot: $199/month FTRX - up to $10,000 profit
- Trade Bot: $199/month FTRX - up to $10,000 profit  
- Arbitrage Bot: $99/month FTRX - up to $10,000 profit
- Copy Trade: $99/month FTRX or $499 Premium (team portfolios, up to $50,000)
- Dedicated panel, non-custodial, auto-payout
- Exclusive bot option: support@futuroxai.com

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina
- [ ] Holder Bot: redeploy needed for skip-existing-holders fix

### P2
- [ ] Refactoring Admin.jsx (>1600 linii → osobne komponenty)
- [ ] Persistentne logi transakcji Volume Bot w MongoDB
- [ ] Telegram/Discord webhook notyfikacje
- [ ] Fix ostrzezen kompilacji React (useCallback, Webpack)
