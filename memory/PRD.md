# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot + Multi-Bot Platform.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter, Recharts, i18next
- **Backend**: FastAPI, MongoDB (Motor), httpx, solders, base58
- **APIs**: CoinGecko (SOL), DexScreener (FTRX/tokens), Jupiter V1 Swap API, Solana RPC

## Completed Work
- [x] Landing page with i18n (EN/ES/PL), countdown, tokenomics, roadmap
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Volume Bot with Organic Mode v2 (SOL concentration, auto ATA prescan)
- [x] Multi-Bot Panel: Volume, Spread, Sniper, Trade, Arbitrage, Copy Trade
- [x] Full Volume Bot dashboard preserved (all original features)
- [x] Bot navigation bar in header
- [x] Generic bot dashboards with Phantom wallet funding
- [x] Sniper Bot: TRUE auto-discovery of new Raydium pools + auto buy/sell
- [x] Volume Bot: 429 rate limit handling (10s backoff), min 10s between trades
- [x] Volume Bot: load_config() before FTRX fetch to ensure token_mint loaded
- [x] Volume Bot: FTRX balance error logging for debugging

## Volume Bot Fixes (Latest)
- 429 rate limit: waits 10s and retries (instead of giving up)
- Minimum 10s between trades (prevents Jupiter rate limiting)
- Slippage starts from configured value, retries +300, +600
- load_config() called before FTRX balance fetch
- Error logging for FTRX fetch failures

## Sniper Bot (Auto-Discovery Mode)
- Scans DexScreener for new Raydium pools on Solana
- Filters by: liquidity (min/max USD), pool age (max seconds)
- Auto-buys tokens from fresh pools
- Monitors positions for take-profit / stop-loss
- Max concurrent positions configurable
- Blacklists failed tokens to avoid retrying

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina

### P2
- [ ] Persystentne logi transakcji w MongoDB
- [ ] Telegram/Discord notyfikacje
