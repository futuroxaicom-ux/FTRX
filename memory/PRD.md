# FuturoX AI - Product Requirements Document

## Original Problem Statement
Strona kryptowalutowa "FuturoX AI" z tickerem "FTRX" na ekosystemie Solana + Volume Bot + Multi-Bot Platform.

## Tech Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, React Router, Solana Wallet Adapter, Recharts, i18next
- **Backend**: FastAPI, MongoDB (Motor), httpx, solders, base58
- **APIs**: CoinGecko (SOL), DexScreener (FTRX/tokens), Jupiter V1 Swap API, Solana RPC

## Architecture
```
/app
├── backend/
│   ├── server.py          # FastAPI + BOT_REGISTRY + generic bot endpoints
│   ├── volume_bot.py      # Volume Bot (organic mode, batch RPC, SOL concentration)
│   ├── spread_bot.py      # Spread Bot (market making)
│   ├── sniper_bot.py      # Sniper Bot (new pool detection)
│   ├── trade_bot.py       # Trade Bot (strategies: momentum, mean_reversion, dca)
│   ├── arbitrage_bot.py   # Arbitrage Bot (cross-DEX)
│   ├── copytrade_bot.py   # Copy Trade Bot (whale following)
│   └── bot_utils.py       # Shared utilities (wallet gen, RPC, Jupiter swap)
├── frontend/src/
│   ├── pages/Home.jsx     # Landing page
│   ├── pages/Admin.jsx    # Full Volume Bot dashboard + Multi-bot nav + Generic bot dashboards
│   ├── components/        # TokenPurchase, BuyOptions, LivePriceChart, etc.
│   ├── config/links.js    # External links
│   ├── locales/           # EN, ES, PL
│   └── contexts/SolanaProvider.jsx
```

## Completed Work
- [x] Landing page with i18n (EN/ES/PL), countdown, tokenomics, roadmap
- [x] Solana wallet connection (Phantom, Solflare)
- [x] Live SOL/FTRX price charts
- [x] Whitelist collection
- [x] Volume Bot with Organic Mode v2 (tested on mainnet)
- [x] Activity Chart, Cost Efficiency, Batch RPC, Dynamic Slippage, ATA detection
- [x] FTRX balance bug fix (Apr 2026)
- [x] Multi-Bot Admin Panel - 6 bots with navigation (Apr 2026)
- [x] Volume Bot improvements: SOL concentration, auto ATA prescan, lower slippage (300 bps), no simulation step (Apr 2026)
- [x] Full Volume Bot dashboard restored with all original features + bot nav bar (Apr 2026)

## Volume Bot Improvements (Latest)
- Slippage: starts at 300 bps (3%), retries at 600 (6%), 900 (9%)
- Removed simulation step (was causing extra errors)
- Auto ATA prescan on bot start
- SOL concentration transfers (collects from many wallets into one for bigger trades)
- Higher TRANSFER_SOL weight (20 vs old 10) for more SOL circulation

## Backlog
### P1
- [ ] Szyfrowanie kluczy prywatnych w MongoDB (AES)
- [ ] Rate limiting na endpointach admina

### P2
- [ ] Persystentne logi transakcji w MongoDB
- [ ] Telegram/Discord notyfikacje

### P3
- [ ] Source map warnings cleanup
- [ ] Refaktor Home.jsx (400+ linii)
