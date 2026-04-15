# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot + Multi-Bot Platform.

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
- [x] Holder Bot: Token-Only mode (distribute tokens to create holders) + Classic SOL mode
- [x] Holder Bot presets: 100, 250, 500, 1000, 5000 holders
- [x] Analytics tracking dashboard
- [x] Direct SPL Token collection, distribution, withdrawal endpoints
- [x] Withdraw tokens to external address endpoint
- [x] Fix: RPC batch 403/429 for token balances → single calls with mainnet-beta
- [x] Fix: Dynamic token labels (FTRX/MAKK GL/Token) per bot type

## Bot Makk GL - Token Pair Mode
- New MAKK GL: qs1KKaWkjgKw2N2uEGfB5Ws1p2Hi3RRj5binQM5MAKK
- New CRBR: 5QevNRQzaYs7QuDCRcfEg8vA75ApZqmYg3TqL7vUcRbr
- DexLab pool: AbJmT451fTE2EYQUZDtMCMfiueYumaP36cvtGi3MYCxH
- Jupiter routing: MAKK→CRBR via DexLab, CRBR→MAKK via DexLab
- BUY = 5-30% of MAKK GL → CRBR, SELL = 60-95% CRBR → MAKK GL

## Holder Bot - Token-Only Mode
- Distribute tokens from main wallet to sub-wallets (SPL transfer)
- Creates ATA + transfers in single TX per wallet
- Cost: ~0.002 SOL per holder (ATA rent)
- Presets: 100, 250, 500, 1000, 5000

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina

### P2
- [ ] Refactoring Admin.jsx (>1600 linii → osobne komponenty)
- [ ] Persystentne logi transakcji Volume Bot w MongoDB
- [ ] Telegram/Discord webhook notyfikacje
- [ ] Fix ostrzezen kompilacji React (useCallback, Webpack)
